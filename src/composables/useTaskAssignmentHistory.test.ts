import { describe, expect, it, vi } from 'vitest'

import { fetchTaskAssignmentHistoryApi } from '@/api/task'
import { useTaskAssignmentHistory } from '@/composables/useTaskAssignmentHistory'
import type { TaskAssignmentHistoryPageWire } from '@/types/task'
import { ApiRequestError } from '@/utils/request'

vi.mock('@/api/task', () => ({
  fetchTaskAssignmentHistoryApi: vi.fn(),
}))

const historyRecord = (id: number, taskId = 101) => ({
  id,
  taskId,
  action: 'ASSIGN',
  fromAssignee: null,
  toAssignee: { userId: 2, username: 'Alice' },
  assignedBy: { userId: 1, username: 'Owner' },
  reason: 'handoff',
  createTime: '2026-09-01T10:00:00',
})

const historyPage = (
  current: number,
  records = [historyRecord(current)],
  overrides: Partial<TaskAssignmentHistoryPageWire> = {},
): TaskAssignmentHistoryPageWire => ({
  records,
  current,
  size: 50,
  total: 100,
  ...overrides,
})

describe('useTaskAssignmentHistory', () => {
  it('opens the first page with the frozen default pagination', async () => {
    vi.mocked(fetchTaskAssignmentHistoryApi).mockResolvedValue(historyPage(1))
    const history = useTaskAssignmentHistory()

    await expect(history.open('101')).resolves.toEqual({ kind: 'success' })

    expect(fetchTaskAssignmentHistoryApi).toHaveBeenCalledWith('101', { current: 1, size: 50 })
    expect(history.records.value.map((record) => record.id)).toEqual(['1'])
    expect(history.phase.value).toBe('ready')
    expect(history.hasMore.value).toBe(true)
  })

  it('appends pages in server order and removes duplicate ids across pages', async () => {
    vi.mocked(fetchTaskAssignmentHistoryApi)
      .mockResolvedValueOnce(historyPage(1, [historyRecord(2), historyRecord(1)]))
      .mockResolvedValueOnce(historyPage(2, [historyRecord(1), historyRecord(0)], { total: 100 }))
    const history = useTaskAssignmentHistory()

    await history.open(101)
    await expect(history.loadMore()).resolves.toEqual({ kind: 'success' })

    expect(history.records.value.map((record) => record.id)).toEqual(['2', '1'])
    expect(history.current.value).toBe(2)
    expect(history.hasMore.value).toBe(false)
  })

  it('preserves loaded records when loading the next page fails and retries that page', async () => {
    vi.mocked(fetchTaskAssignmentHistoryApi)
      .mockResolvedValueOnce(historyPage(1))
      .mockRejectedValueOnce(new ApiRequestError('offline'))
      .mockResolvedValueOnce(historyPage(2, [historyRecord(2)]))
    const history = useTaskAssignmentHistory()

    await history.open(101)
    await expect(history.loadMore()).resolves.toEqual({ kind: 'error', errorKind: 'NETWORK' })
    expect(history.records.value.map((record) => record.id)).toEqual(['1'])
    expect(history.phase.value).toBe('load-more-error')

    await expect(history.loadMore()).resolves.toEqual({ kind: 'success' })
    expect(fetchTaskAssignmentHistoryApi).toHaveBeenLastCalledWith('101', { current: 2, size: 50 })
  })

  it('replaces records from page one when refreshing', async () => {
    vi.mocked(fetchTaskAssignmentHistoryApi)
      .mockResolvedValueOnce(historyPage(1, [historyRecord(1)]))
      .mockResolvedValueOnce(historyPage(1, [historyRecord(2)], { total: 1 }))
    const history = useTaskAssignmentHistory()

    await history.open(101)
    await history.refresh()

    expect(history.records.value.map((record) => record.id)).toEqual(['2'])
    expect(history.current.value).toBe(1)
    expect(history.hasMore.value).toBe(false)
  })

  it('discards a late response after another task opens', async () => {
    let resolveFirst!: (value: TaskAssignmentHistoryPageWire) => void
    const firstRequest = new Promise<TaskAssignmentHistoryPageWire>((resolve) => {
      resolveFirst = resolve
    })
    vi.mocked(fetchTaskAssignmentHistoryApi)
      .mockReturnValueOnce(firstRequest as never)
      .mockResolvedValueOnce(historyPage(1, [historyRecord(2, 202)], { total: 1 }))
    const history = useTaskAssignmentHistory()

    const taskA = history.open(101)
    const taskB = history.open(202)
    await expect(taskB).resolves.toEqual({ kind: 'success' })
    resolveFirst(historyPage(1, [historyRecord(1, 101)], { total: 1 }))

    await expect(taskA).resolves.toEqual({ kind: 'stale' })
    expect(history.activeTaskId.value).toBe('202')
    expect(history.records.value.map((record) => record.taskId)).toEqual(['202'])
  })

  it('discards a response after reset and keeps the composable idle', async () => {
    let resolveRequest!: (value: TaskAssignmentHistoryPageWire) => void
    const request = new Promise<TaskAssignmentHistoryPageWire>((resolve) => {
      resolveRequest = resolve
    })
    vi.mocked(fetchTaskAssignmentHistoryApi).mockReturnValue(request as never)
    const history = useTaskAssignmentHistory()

    const pending = history.open(101)
    history.reset()
    resolveRequest(historyPage(1))

    await expect(pending).resolves.toEqual({ kind: 'stale' })
    expect(history.phase.value).toBe('idle')
    expect(history.records.value).toEqual([])
  })

  it('clears sensitive records on permission loss and classifies a missing task', async () => {
    vi.mocked(fetchTaskAssignmentHistoryApi)
      .mockResolvedValueOnce(historyPage(1))
      .mockRejectedValueOnce(new ApiRequestError('denied', { code: 40300 }))
      .mockRejectedValueOnce(new ApiRequestError('missing', { code: 40400 }))
    const history = useTaskAssignmentHistory()

    await history.open(101)
    await expect(history.refresh()).resolves.toEqual({
      kind: 'error',
      errorKind: 'PERMISSION_DENIED',
    })
    expect(history.phase.value).toBe('forbidden')
    expect(history.records.value).toEqual([])

    await expect(history.open(202)).resolves.toEqual({ kind: 'error', errorKind: 'NOT_FOUND' })
    expect(history.phase.value).toBe('not-found')
  })

  it('fails closed for malformed pages and never persists history', async () => {
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem')
    vi.mocked(fetchTaskAssignmentHistoryApi).mockResolvedValue(historyPage(2))
    const history = useTaskAssignmentHistory()

    await expect(history.open(101)).resolves.toEqual({ kind: 'error', errorKind: 'UNKNOWN' })
    expect(history.records.value).toEqual([])
    expect(history.phase.value).toBe('error')
    expect(storageSpy).not.toHaveBeenCalled()
  })

  it('rejects an invalid task id without issuing a request', async () => {
    const history = useTaskAssignmentHistory()

    await expect(history.open('bad-id')).resolves.toEqual({
      kind: 'error',
      errorKind: 'VALIDATION',
    })
    expect(fetchTaskAssignmentHistoryApi).not.toHaveBeenCalled()
    expect(history.phase.value).toBe('error')
  })
})
