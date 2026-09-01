import { normalizeEntityId, normalizeTaskAssignmentHistory } from '@/types/normalization'
import type {
  AssignmentAction,
  AssignmentUserSummary,
  TaskAssignmentHistory,
  TaskAssignmentHistoryPageWire,
} from '@/types/task'

export const TASK_ASSIGNMENT_HISTORY_DEFAULT_SIZE = 50
export const TASK_ASSIGNMENT_HISTORY_MAX_SIZE = 100

export interface TaskAssignmentHistoryPage {
  records: TaskAssignmentHistory[]
  current: number
  size: number
  total: number
}

export interface NormalizeTaskAssignmentHistoryPageOptions {
  expectedCurrent?: number
  expectedSize?: number
}

const ACTION_LABELS: Record<AssignmentAction, string> = {
  INITIAL_ASSIGN: '初始分配',
  ASSIGN: '分配负责人',
  REASSIGN: '转派负责人',
  UNASSIGN: '解除分配',
  MEMBER_LEFT: '成员退出，自动解除',
  MEMBER_REMOVED: '成员被移除，自动解除',
}

const parseInteger = (value: unknown, min: number, max = Number.MAX_SAFE_INTEGER) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) return null
  return parsed
}

export const resolveTaskAssignmentActionLabel = (action: AssignmentAction | 'UNKNOWN') =>
  action === 'UNKNOWN' ? '未知负责人变更' : ACTION_LABELS[action]

export const resolveTaskAssignmentUserLabel = (summary: AssignmentUserSummary) => {
  const username = summary.username?.trim()
  if (username) return username
  if (summary.userId) return `用户 #${summary.userId}`
  return '未分配'
}

export const resolveTaskAssignmentReason = (reason: string | null) =>
  typeof reason === 'string' && reason.trim() ? reason : null

export const normalizeTaskAssignmentHistoryPage = (
  page: TaskAssignmentHistoryPageWire | null | undefined,
  expectedTaskIdValue: unknown,
  options: NormalizeTaskAssignmentHistoryPageOptions = {},
): TaskAssignmentHistoryPage | null => {
  if (!page || typeof page !== 'object' || !Array.isArray(page.records)) return null

  const expectedTaskId = normalizeEntityId(expectedTaskIdValue)
  if (!expectedTaskId) return null

  const current = parseInteger(page.current, 1)
  const size = parseInteger(page.size, 1, TASK_ASSIGNMENT_HISTORY_MAX_SIZE)
  const total = parseInteger(page.total, 0)
  if (current === null || size === null || total === null) return null
  if (options.expectedCurrent !== undefined && current !== options.expectedCurrent) return null
  if (options.expectedSize !== undefined && size !== options.expectedSize) return null

  const seenIds = new Set<string>()
  const records = page.records.flatMap((wireRecord) => {
    const record = normalizeTaskAssignmentHistory(wireRecord)
    if (!record || record.taskId !== expectedTaskId || seenIds.has(record.id)) return []
    seenIds.add(record.id)
    return [record]
  })

  return { records, current, size, total }
}
