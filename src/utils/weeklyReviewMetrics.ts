import type { WeeklyReviewDetail } from '@/types/review'
import type { TaskModel } from '@/types/task'
import { isTaskCompleted } from '@/utils/taskStatus'

export type WeeklyReviewMetricTask = Pick<TaskModel, 'assigneeUserId' | 'dueDate' | 'status'>

export interface WeeklyReviewAuxiliaryMetrics {
  currentAssignedCount: number | null
  currentCompletedCount: number | null
  previousAssignedCount: number | null
  previousCompletedCount: number | null
  currentCompletionRate: number | null
  previousCompletionRate: number | null
  completionRateDiff: number | null
}

export interface WeeklyReviewAuthoritativeCompletedTaskSummary {
  currentCompletedTaskCount: number
  previousCompletedTaskCount: number | null
  completedTaskCountDiff: number | null
}

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIMEZONE_BASELINE = 'Asia/Shanghai'
const DATE_KEY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE_BASELINE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export const createWeeklyReviewAuxiliaryMetricsPlaceholder = (): WeeklyReviewAuxiliaryMetrics => ({
  currentAssignedCount: null,
  currentCompletedCount: null,
  previousAssignedCount: null,
  previousCompletedCount: null,
  currentCompletionRate: null,
  previousCompletionRate: null,
  completionRateDiff: null,
})

export const normalizeWeeklyReviewDateKey = (value: string | null | undefined) => {
  if (!value) return null
  const trimmed = value.trim()
  if (DATE_KEY_PATTERN.test(trimmed)) return trimmed

  const timestamp = Date.parse(trimmed)
  if (Number.isNaN(timestamp)) return null
  return DATE_KEY_FORMATTER.format(new Date(timestamp))
}

export const shiftWeeklyReviewDateKey = (dateKey: string, offsetDays: number) => {
  const normalized = normalizeWeeklyReviewDateKey(dateKey)
  if (!normalized) return null

  const timestamp = Date.parse(`${normalized}T00:00:00Z`)
  if (Number.isNaN(timestamp)) return null
  const shifted = new Date(timestamp + offsetDays * 24 * 60 * 60 * 1000)
  const year = shifted.getUTCFullYear()
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const day = String(shifted.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isDateKeyWithinRange = (dateKey: string, startDate: string, endDate: string) => (
  dateKey >= startDate && dateKey <= endDate
)

const calculateRate = (completed: number, assigned: number) => (
  assigned === 0 ? null : (completed / assigned) * 100
)

export const calculateWeeklyReviewAuxiliaryMetrics = (
  tasks: WeeklyReviewMetricTask[],
  actorId: string | null | undefined,
  rawStartDate: string | null | undefined,
  rawEndDate: string | null | undefined,
): WeeklyReviewAuxiliaryMetrics => {
  const startDate = normalizeWeeklyReviewDateKey(rawStartDate)
  const endDate = normalizeWeeklyReviewDateKey(rawEndDate)
  if (!actorId || !startDate || !endDate || startDate > endDate) {
    return createWeeklyReviewAuxiliaryMetricsPlaceholder()
  }

  const previousStartDate = shiftWeeklyReviewDateKey(startDate, -7)
  const previousEndDate = shiftWeeklyReviewDateKey(endDate, -7)
  if (!previousStartDate || !previousEndDate) {
    return createWeeklyReviewAuxiliaryMetricsPlaceholder()
  }

  let currentAssignedCount = 0
  let currentCompletedCount = 0
  let previousAssignedCount = 0
  let previousCompletedCount = 0

  tasks.forEach((task) => {
    if (task.assigneeUserId !== actorId) return
    const dueDateKey = normalizeWeeklyReviewDateKey(task.dueDate)
    if (!dueDateKey) return

    if (isDateKeyWithinRange(dueDateKey, startDate, endDate)) {
      currentAssignedCount += 1
      if (isTaskCompleted(task.status)) currentCompletedCount += 1
      return
    }

    if (isDateKeyWithinRange(dueDateKey, previousStartDate, previousEndDate)) {
      previousAssignedCount += 1
      if (isTaskCompleted(task.status)) previousCompletedCount += 1
    }
  })

  const currentCompletionRate = calculateRate(currentCompletedCount, currentAssignedCount)
  const previousCompletionRate = calculateRate(previousCompletedCount, previousAssignedCount)

  return {
    currentAssignedCount,
    currentCompletedCount,
    previousAssignedCount,
    previousCompletedCount,
    currentCompletionRate,
    previousCompletionRate,
    completionRateDiff:
      currentCompletionRate === null || previousCompletionRate === null
        ? null
        : currentCompletionRate - previousCompletionRate,
  }
}

export const findPreviousWeeklyReviewCompletedTaskCount = (
  currentReview: Pick<WeeklyReviewDetail, 'startDate' | 'endDate'>,
  historyReviews: Array<Pick<WeeklyReviewDetail, 'startDate' | 'endDate' | 'completedTaskCount'>>,
) => {
  const currentStartDate = normalizeWeeklyReviewDateKey(currentReview.startDate)
  const currentEndDate = normalizeWeeklyReviewDateKey(currentReview.endDate)
  if (!currentStartDate || !currentEndDate) return null

  const previousStartDate = shiftWeeklyReviewDateKey(currentStartDate, -7)
  const previousEndDate = shiftWeeklyReviewDateKey(currentEndDate, -7)
  if (!previousStartDate || !previousEndDate) return null

  return historyReviews.find((review) => (
    normalizeWeeklyReviewDateKey(review.startDate) === previousStartDate
    && normalizeWeeklyReviewDateKey(review.endDate) === previousEndDate
  ))?.completedTaskCount ?? null
}

export const buildWeeklyReviewAuthoritativeCompletedTaskSummary = (
  currentReview: Pick<WeeklyReviewDetail, 'startDate' | 'endDate' | 'completedTaskCount'>,
  historyReviews: Array<Pick<WeeklyReviewDetail, 'startDate' | 'endDate' | 'completedTaskCount'>>,
): WeeklyReviewAuthoritativeCompletedTaskSummary => {
  const previousCompletedTaskCount = findPreviousWeeklyReviewCompletedTaskCount(
    currentReview,
    historyReviews,
  )
  return {
    currentCompletedTaskCount: currentReview.completedTaskCount,
    previousCompletedTaskCount,
    completedTaskCountDiff: previousCompletedTaskCount === null
      ? null
      : currentReview.completedTaskCount - previousCompletedTaskCount,
  }
}
