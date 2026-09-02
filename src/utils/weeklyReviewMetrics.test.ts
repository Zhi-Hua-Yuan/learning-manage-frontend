import { describe, expect, it } from 'vitest'

import {
  buildWeeklyReviewAuthoritativeCompletedTaskSummary,
  calculateWeeklyReviewAuxiliaryMetrics,
  findPreviousWeeklyReviewCompletedTaskCount,
} from './weeklyReviewMetrics'
import type { WeeklyReviewMetricTask } from './weeklyReviewMetrics'

const task = (
  assigneeUserId: string | null,
  dueDate: string | null,
  status: number,
): WeeklyReviewMetricTask => ({ assigneeUserId, dueDate, status })

describe('weekly review metric authority boundary', () => {
  it('counts only tasks currently assigned to the active actor', () => {
    const metrics = calculateWeeklyReviewAuxiliaryMetrics([
      task('1', '2026-09-01', 2),
      task('1', '2026-09-02', 0),
      task('2', '2026-09-03', 2),
      task(null, '2026-09-04', 2),
      task('1', '2026-08-25', 2),
      task('2', '2026-08-26', 2),
    ], '1', '2026-08-31', '2026-09-06')

    expect(metrics).toEqual({
      currentAssignedCount: 2,
      currentCompletedCount: 1,
      previousAssignedCount: 1,
      previousCompletedCount: 1,
      currentCompletionRate: 50,
      previousCompletionRate: 100,
      completionRateDiff: -50,
    })
  })

  it('fails closed when the actor or date range is unavailable', () => {
    const tasks = [task('1', '2026-09-01', 2)]

    expect(calculateWeeklyReviewAuxiliaryMetrics(tasks, null, '2026-08-31', '2026-09-06'))
      .toEqual(expect.objectContaining({
        currentAssignedCount: null,
        currentCompletedCount: null,
        currentCompletionRate: null,
      }))
    expect(calculateWeeklyReviewAuxiliaryMetrics(tasks, '1', null, '2026-09-06'))
      .toEqual(expect.objectContaining({ currentAssignedCount: null }))
  })

  it('finds the authoritative previous review across a year boundary', () => {
    const previousCount = findPreviousWeeklyReviewCompletedTaskCount(
      { startDate: '2027-01-04', endDate: '2027-01-10' },
      [
        { startDate: '2026-12-28', endDate: '2027-01-03', completedTaskCount: 7 },
        { startDate: '2026-12-21', endDate: '2026-12-27', completedTaskCount: 3 },
      ],
    )

    expect(previousCount).toBe(7)
  })

  it('keeps the server completed count authoritative when client task data disagrees', () => {
    const clientMetrics = calculateWeeklyReviewAuxiliaryMetrics([
      task('1', '2026-09-01', 2),
      task('1', '2026-09-02', 2),
    ], '1', '2026-08-31', '2026-09-06')
    const serverSummary = buildWeeklyReviewAuthoritativeCompletedTaskSummary(
      { startDate: '2026-08-31', endDate: '2026-09-06', completedTaskCount: 7 },
      [{ startDate: '2026-08-24', endDate: '2026-08-30', completedTaskCount: 5 }],
    )

    expect(clientMetrics.currentCompletedCount).toBe(2)
    expect(serverSummary).toEqual({
      currentCompletedTaskCount: 7,
      previousCompletedTaskCount: 5,
      completedTaskCountDiff: 2,
    })
  })
})
