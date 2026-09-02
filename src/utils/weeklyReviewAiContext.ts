import type { TaskModel } from '@/types/task'
import { normalizeEntityId } from '@/types/normalization'
import { normalizeWeeklyReviewDateKey } from '@/utils/weeklyReviewMetrics'
import { isTaskCompleted } from '@/utils/taskStatus'

export type WeeklyPolishTaskSource = 'EXPLICIT' | 'FALLBACK'

export type WeeklyPolishTaskContext =
  | { ready: true; source: WeeklyPolishTaskSource; taskIds: string[] }
  | {
      ready: false
      reason:
        | 'ACTOR_UNAVAILABLE'
        | 'DATE_RANGE_UNAVAILABLE'
        | 'INVALID_EXPLICIT_TASK_IDS'
        | 'TASK_SNAPSHOT_INCOMPLETE'
    }

interface ResolveWeeklyPolishTaskContextInput {
  selectedTaskIds: readonly string[]
  snapshotTasks: readonly TaskModel[]
  snapshotComplete: boolean
  actorId: string | null
  startDate: string | null
  endDate: string | null
}

const uniqueEntityIds = (values: readonly string[]) => {
  const seen = new Set<string>()
  const result: string[] = []

  values.forEach((value) => {
    const normalized = normalizeEntityId(value)
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    result.push(normalized)
  })

  return result
}

export const normalizeAiPolishResponse = (payload: unknown): string | null => {
  if (payload && typeof payload === 'object') {
    const review = (payload as { review?: unknown }).review
    return typeof review === 'string' && review.trim() ? review.trim() : null
  }

  if (typeof payload !== 'string' || !payload.trim()) return null

  try {
    const parsed = JSON.parse(payload) as { review?: unknown }
    return typeof parsed.review === 'string' && parsed.review.trim() ? parsed.review.trim() : null
  } catch {
    return null
  }
}

export const resolveWeeklyPolishTaskContext = (
  input: ResolveWeeklyPolishTaskContextInput,
): WeeklyPolishTaskContext => {
  if (!input.actorId) return { ready: false, reason: 'ACTOR_UNAVAILABLE' }

  const hasInvalidExplicitTaskId = input.selectedTaskIds.some((taskId) => !normalizeEntityId(taskId))
  if (hasInvalidExplicitTaskId) return { ready: false, reason: 'INVALID_EXPLICIT_TASK_IDS' }
  const explicitTaskIds = uniqueEntityIds(input.selectedTaskIds)
  if (explicitTaskIds.length > 0) {
    return { ready: true, source: 'EXPLICIT', taskIds: explicitTaskIds }
  }

  const startDate = normalizeWeeklyReviewDateKey(input.startDate)
  const endDate = normalizeWeeklyReviewDateKey(input.endDate)
  if (!startDate || !endDate || startDate > endDate) {
    return { ready: false, reason: 'DATE_RANGE_UNAVAILABLE' }
  }
  if (!input.snapshotComplete) return { ready: false, reason: 'TASK_SNAPSHOT_INCOMPLETE' }

  const taskIds = uniqueEntityIds(input.snapshotTasks.flatMap((task) => {
    const completedDate = normalizeWeeklyReviewDateKey(task.completedAt)
    if (
      task.assigneeUserId !== input.actorId
      || !isTaskCompleted(task.status)
      || !completedDate
      || completedDate < startDate
      || completedDate > endDate
    ) return []
    return [task.id]
  }))

  return { ready: true, source: 'FALLBACK', taskIds }
}
