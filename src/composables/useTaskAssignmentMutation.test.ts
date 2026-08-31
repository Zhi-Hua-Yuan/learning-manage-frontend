import { describe, expect, it, vi } from 'vitest'

import { assignTaskApi } from '@/api/task'
import { useTaskAssignmentMutation } from '@/composables/useTaskAssignmentMutation'
import type { TaskAssignmentResultWire } from '@/types/task'
import { ApiRequestError } from '@/utils/request'

vi.mock('@/api/task', () => ({
  assignTaskApi: vi.fn(),
}))

const result = (overrides: Record<string, unknown> = {}) => ({
  taskId: 101,
  changed: true,
  previousAssigneeUserId: null,
  assigneeUserId: 2,
  assignedByUserId: 1,
  assignedAt: '2026-09-01T12:00:00',
  ...overrides,
})

describe('useTaskAssignmentMutation', () => {
  it('submits an explicit null expected assignee and enters refreshing on success', async () => {
    vi.mocked(assignTaskApi).mockResolvedValue(result())
    const mutation = useTaskAssignmentMutation()

    const outcome = await mutation.submit({
      taskId: '101',
      assigneeUserId: '2',
      expectedAssigneeUserId: null,
      reason: 'handoff',
    })

    expect(assignTaskApi).toHaveBeenCalledWith({
      taskId: '101',
      assigneeUserId: '2',
      expectedAssigneeUserId: null,
      reason: 'handoff',
    })
    expect(outcome).toMatchObject({
      kind: 'success',
      result: {
        taskId: '101',
        changed: true,
        assigneeUserId: '2',
      },
    })
    expect(mutation.phase.value).toBe('refreshing')
    expect(mutation.busy.value).toBe(true)

    mutation.complete()
    expect(mutation.phase.value).toBe('idle')
  })

  it('ignores duplicate submissions while the first request is pending', async () => {
    let resolveRequest!: (value: TaskAssignmentResultWire) => void
    const pendingRequest = new Promise<TaskAssignmentResultWire>((resolve) => {
      resolveRequest = resolve
    })
    vi.mocked(assignTaskApi).mockReturnValue(pendingRequest as never)
    const mutation = useTaskAssignmentMutation()
    const payload = {
      taskId: '101',
      assigneeUserId: '2',
      expectedAssigneeUserId: null,
    }

    const first = mutation.submit(payload)
    const second = await mutation.submit(payload)

    expect(second).toEqual({ kind: 'ignored' })
    expect(assignTaskApi).toHaveBeenCalledTimes(1)

    resolveRequest(result())
    await first
  })

  it('blocks malformed or contradictory success results', async () => {
    vi.mocked(assignTaskApi).mockResolvedValue(result({ assigneeUserId: 3 }))
    const mutation = useTaskAssignmentMutation()

    const outcome = await mutation.submit({
      taskId: '101',
      assigneeUserId: '2',
      expectedAssigneeUserId: null,
    })

    expect(outcome).toEqual({ kind: 'error', errorKind: 'UNKNOWN' })
    expect(mutation.phase.value).toBe('blocked')
    expect(mutation.errorMessage.value).toContain('无法确认')
  })

  it('submits an explicit null target for unassignment', async () => {
    vi.mocked(assignTaskApi).mockResolvedValue(result({
      previousAssigneeUserId: 2,
      assigneeUserId: null,
    }))
    const mutation = useTaskAssignmentMutation()

    const outcome = await mutation.submit({
      taskId: '101',
      assigneeUserId: null,
      expectedAssigneeUserId: '2',
    })

    expect(assignTaskApi).toHaveBeenCalledWith({
      taskId: '101',
      assigneeUserId: null,
      expectedAssigneeUserId: '2',
    })
    expect(outcome).toMatchObject({
      kind: 'success',
      result: { changed: true, assigneeUserId: null },
    })
  })

  it('keeps validation retryable but blocks conflicts', async () => {
    const mutation = useTaskAssignmentMutation()
    vi.mocked(assignTaskApi).mockRejectedValueOnce(new ApiRequestError('invalid', { code: 40000 }))

    const validation = await mutation.submit({
      taskId: '101',
      assigneeUserId: '2',
      expectedAssigneeUserId: null,
    })

    expect(validation).toEqual({ kind: 'error', errorKind: 'VALIDATION' })
    expect(mutation.phase.value).toBe('idle')

    mutation.reset()
    vi.mocked(assignTaskApi).mockRejectedValueOnce(new ApiRequestError('conflict', { code: 50001 }))
    const conflict = await mutation.submit({
      taskId: '101',
      assigneeUserId: '2',
      expectedAssigneeUserId: null,
    })

    expect(conflict).toEqual({ kind: 'error', errorKind: 'CONFLICT' })
    expect(mutation.phase.value).toBe('blocked')
  })

  it('discards a response after the surrounding task context resets', async () => {
    let resolveRequest!: (value: TaskAssignmentResultWire) => void
    const pendingRequest = new Promise<TaskAssignmentResultWire>((resolve) => {
      resolveRequest = resolve
    })
    vi.mocked(assignTaskApi).mockReturnValue(pendingRequest as never)
    const mutation = useTaskAssignmentMutation()

    const pending = mutation.submit({
      taskId: '101',
      assigneeUserId: '2',
      expectedAssigneeUserId: null,
    })
    mutation.reset()
    resolveRequest(result())

    await expect(pending).resolves.toEqual({ kind: 'stale' })
    expect(mutation.phase.value).toBe('idle')
  })
})
