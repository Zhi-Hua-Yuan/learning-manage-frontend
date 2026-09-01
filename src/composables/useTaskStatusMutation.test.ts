import { describe, expect, it, vi } from 'vitest'

import { changeTaskStatusApi } from '@/api/task'
import { ApiRequestError } from '@/utils/request'
import type { TaskStatusResultWire } from '@/types/task'
import { useTaskStatusMutation } from './useTaskStatusMutation'

vi.mock('@/api/task', () => ({
  changeTaskStatusApi: vi.fn(),
}))

const input = (taskId = '11') => ({
  taskId,
  projectId: '7',
  contextKey: 'project:7',
  expectedStatus: 0,
  targetStatus: 2,
  previousCompletedAt: null,
})

const success = (overrides: Record<string, unknown> = {}) => ({
  changed: true,
  finalStatus: 2,
  completedAt: '2026-09-01T12:00:00',
  idempotentReplay: false,
  ...overrides,
})

describe('useTaskStatusMutation', () => {
  it('creates a new command and preserves the exact payload for an uncertain retry', async () => {
    vi.mocked(changeTaskStatusApi)
      .mockRejectedValueOnce(new ApiRequestError('offline'))
      .mockResolvedValueOnce(success({ idempotentReplay: true }))
    const mutation = useTaskStatusMutation()

    const first = await mutation.submitNew(input())
    expect(first.kind).toBe('error')
    expect(mutation.getState('11')?.phase).toBe('uncertain')
    const firstPayload = vi.mocked(changeTaskStatusApi).mock.calls[0]?.[0]

    const retried = await mutation.retryUncertain('11')
    expect(retried.kind).toBe('success')
    expect(vi.mocked(changeTaskStatusApi)).toHaveBeenCalledTimes(2)
    expect(vi.mocked(changeTaskStatusApi).mock.calls[1]?.[0]).toEqual(firstPayload)
    expect(firstPayload?.clientRequestId).toEqual(expect.any(String))
  })

  it('blocks a second target for the same task while allowing another task', async () => {
    let resolveFirst!: (value: TaskStatusResultWire) => void
    vi.mocked(changeTaskStatusApi)
      .mockImplementationOnce((() => new Promise<TaskStatusResultWire>(
        (resolve) => { resolveFirst = resolve },
      )) as never)
      .mockResolvedValueOnce(success())
    const mutation = useTaskStatusMutation()

    const pending = mutation.submitNew(input('11'))
    const ignored = await mutation.submitNew({ ...input('11'), targetStatus: 3 })
    const other = await mutation.submitNew(input('12'))

    expect(ignored.kind).toBe('ignored')
    expect(other.kind).toBe('success')
    expect(vi.mocked(changeTaskStatusApi)).toHaveBeenCalledTimes(2)
    resolveFirst(success())
    await pending
  })

  it('keeps conflict commands non-retryable and classifies permission errors', async () => {
    vi.mocked(changeTaskStatusApi)
      .mockRejectedValueOnce(new ApiRequestError('conflict', { code: 50001 }))
      .mockRejectedValueOnce(new ApiRequestError('denied', { code: 40300 }))
    const mutation = useTaskStatusMutation()

    const conflict = await mutation.submitNew(input('11'))
    const denied = await mutation.submitNew(input('12'))

    expect(conflict).toMatchObject({ kind: 'error', errorKind: 'CONFLICT' })
    expect(denied).toMatchObject({ kind: 'error', errorKind: 'PERMISSION_DENIED' })
    expect(mutation.getState('11')?.phase).toBe('reconciling')
    expect((await mutation.retryUncertain('11')).kind).toBe('ignored')
  })

  it('treats an invalid success response as uncertain and keeps the command', async () => {
    vi.mocked(changeTaskStatusApi).mockResolvedValue({
      changed: true,
      finalStatus: 2,
      completedAt: null,
    })
    const mutation = useTaskStatusMutation()

    const outcome = await mutation.submitNew(input())

    expect(outcome).toMatchObject({ kind: 'error', errorKind: 'UNKNOWN' })
    expect(mutation.getState('11')?.phase).toBe('uncertain')
  })

  it('claims changed side effects once even for an idempotent replay', async () => {
    vi.mocked(changeTaskStatusApi).mockResolvedValue(success({ idempotentReplay: true }))
    const mutation = useTaskStatusMutation()

    await mutation.submitNew(input())

    expect(mutation.claimChangedSideEffect('11')).toBe(true)
    expect(mutation.claimChangedSideEffect('11')).toBe(false)
  })

  it('does not claim changed side effects for an idempotent no-op', async () => {
    vi.mocked(changeTaskStatusApi).mockResolvedValue(success({
      changed: false,
      idempotentReplay: true,
    }))
    const mutation = useTaskStatusMutation()

    await mutation.submitNew(input())

    expect(mutation.claimChangedSideEffect('11')).toBe(false)
  })

  it('discards late outcomes after the task state is reset', async () => {
    let resolveRequest!: (value: TaskStatusResultWire) => void
    vi.mocked(changeTaskStatusApi).mockImplementation(
      (() => new Promise<TaskStatusResultWire>(
        (resolve) => { resolveRequest = resolve },
      )) as never,
    )
    const mutation = useTaskStatusMutation()

    const pending = mutation.submitNew(input())
    mutation.resetTask('11')
    resolveRequest(success())

    expect(await pending).toEqual({ kind: 'stale' })
    expect(mutation.getState('11')).toBeNull()
  })

  it('moves an uncertain command through fact reconciliation and retry-only recovery', async () => {
    vi.mocked(changeTaskStatusApi).mockRejectedValue(new ApiRequestError('offline'))
    const mutation = useTaskStatusMutation()
    await mutation.submitNew(input())

    expect(mutation.isBlocked('11')).toBe(true)
    expect(mutation.beginFactReconciliation('11')?.phase).toBe('reconciling')
    expect(mutation.markFactRefreshError('11', 'refresh failed')).toBe(true)
    expect(mutation.getState('11')).toMatchObject({
      phase: 'fact-refresh-error',
      errorMessage: 'refresh failed',
    })
    expect(mutation.beginFactRefreshRetry('11')?.phase).toBe('refreshing')
    expect(mutation.restoreUncertain('11', 'still unknown')).toBe(true)
    expect(mutation.getState('11')).toMatchObject({
      phase: 'uncertain',
      errorMessage: 'still unknown',
    })
  })

  it('keeps committed refresh recovery GET-only and completes it explicitly', async () => {
    vi.mocked(changeTaskStatusApi).mockResolvedValue(success())
    const mutation = useTaskStatusMutation()
    await mutation.submitNew(input())

    expect(mutation.markCommittedRefreshError('11', 'facts unavailable')).toBe(true)
    expect(mutation.getState('11')).toMatchObject({
      phase: 'committed-refresh-error',
      errorMessage: 'facts unavailable',
    })
    expect(mutation.beginFactRefreshRetry('11')?.phase).toBe('refreshing')
    expect(mutation.complete('11')).toBe(true)
    expect(mutation.getState('11')).toBeNull()
  })

  it('fails closed for missing recovery state and clears all task commands', async () => {
    vi.mocked(changeTaskStatusApi)
      .mockRejectedValueOnce(new ApiRequestError('offline'))
      .mockRejectedValueOnce(new ApiRequestError('offline'))
    const mutation = useTaskStatusMutation()
    await mutation.submitNew(input('11'))
    await mutation.submitNew(input('12'))

    expect(mutation.beginFactReconciliation('missing')).toBeNull()
    expect(mutation.restoreUncertain('missing', 'ignored')).toBe(false)
    expect(mutation.markCommittedRefreshError('missing', 'ignored')).toBe(false)
    expect(mutation.markFactRefreshError('missing', 'ignored')).toBe(false)
    expect(mutation.beginFactRefreshRetry('missing')).toBeNull()
    mutation.resetAll()
    expect(mutation.states.size).toBe(0)
  })
})
