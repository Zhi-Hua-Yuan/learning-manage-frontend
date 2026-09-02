import { describe, expect, it } from 'vitest'

import type { TaskModel } from '@/types/task'
import {
  normalizeAiPolishResponse,
  resolveWeeklyPolishTaskContext,
} from './weeklyReviewAiContext'

const task = (overrides: Partial<TaskModel> = {}): TaskModel => ({
  id: '101',
  projectId: '10',
  milestoneId: null,
  createdByUserId: '1',
  assigneeUserId: '1',
  assignedByUserId: '1',
  assignedAt: null,
  title: '完成任务',
  description: null,
  status: 2,
  priority: 1,
  dueDate: '2026-09-02',
  completedAt: '2026-09-03T10:30:00+08:00',
  createTime: null,
  updateTime: null,
  capabilities: {
    canEditContent: false,
    canChangeStatus: false,
    canReorganize: false,
    canAssign: false,
    canDelete: false,
  },
  ...overrides,
})

const baseInput = () => ({
  selectedTaskIds: [] as string[],
  snapshotTasks: [] as TaskModel[],
  snapshotComplete: true,
  actorId: '1',
  startDate: '2026-08-31',
  endDate: '2026-09-06',
})

describe('weekly review AI task context', () => {
  it('prefers explicit associations, deduplicates them and never mixes fallback tasks', () => {
    expect(resolveWeeklyPolishTaskContext({
      ...baseInput(),
      selectedTaskIds: ['201', '201', '202'],
      snapshotTasks: [task({ id: '301' })],
    })).toEqual({ ready: true, source: 'EXPLICIT', taskIds: ['201', '202'] })
  })

  it('does not apply fallback completion or assignee filters to explicit associations', () => {
    expect(resolveWeeklyPolishTaskContext({
      ...baseInput(),
      selectedTaskIds: ['201'],
      snapshotTasks: [task({ id: '201', status: 0, assigneeUserId: '2' })],
    })).toEqual({ ready: true, source: 'EXPLICIT', taskIds: ['201'] })
  })

  it('fails closed for invalid explicit IDs instead of silently dropping them', () => {
    expect(resolveWeeklyPolishTaskContext({
      ...baseInput(),
      selectedTaskIds: ['101', 'invalid'],
    })).toEqual({ ready: false, reason: 'INVALID_EXPLICIT_TASK_IDS' })
  })

  it('builds fallback from current-user completedAt facts only', () => {
    const result = resolveWeeklyPolishTaskContext({
      ...baseInput(),
      snapshotTasks: [
        task({ id: '101' }),
        task({ id: '102', assigneeUserId: '2' }),
        task({ id: '103', status: 0 }),
        task({ id: '104', completedAt: '2026-08-30T23:59:59+08:00' }),
        task({ id: '105', completedAt: '2026-09-07T00:00:00+08:00' }),
        task({ id: '106', dueDate: '2026-08-20', completedAt: '2026-09-04T08:00:00+08:00' }),
        task({ id: '107', dueDate: '2026-09-02', completedAt: '2026-08-20T08:00:00+08:00' }),
      ],
    })

    expect(result).toEqual({ ready: true, source: 'FALLBACK', taskIds: ['101', '106'] })
  })

  it('fails closed when fallback facts are incomplete or lack an actor/date range', () => {
    expect(resolveWeeklyPolishTaskContext({
      ...baseInput(),
      snapshotComplete: false,
    })).toEqual({ ready: false, reason: 'TASK_SNAPSHOT_INCOMPLETE' })
    expect(resolveWeeklyPolishTaskContext({
      ...baseInput(),
      actorId: null,
    })).toEqual({ ready: false, reason: 'ACTOR_UNAVAILABLE' })
    expect(resolveWeeklyPolishTaskContext({
      ...baseInput(),
      startDate: null,
    })).toEqual({ ready: false, reason: 'DATE_RANGE_UNAVAILABLE' })
  })

  it('returns an explicit empty fallback only after a complete snapshot', () => {
    expect(resolveWeeklyPolishTaskContext(baseInput())).toEqual({
      ready: true,
      source: 'FALLBACK',
      taskIds: [],
    })
  })
})

describe('weekly review AI response normalization', () => {
  it('accepts the backend JSON string and a normalized object response', () => {
    expect(normalizeAiPolishResponse('{"review":" 润色后的复盘 "}')).toBe('润色后的复盘')
    expect(normalizeAiPolishResponse({ review: '对象结果' })).toBe('对象结果')
  })

  it('rejects malformed or empty responses without exposing raw output', () => {
    expect(normalizeAiPolishResponse('raw model output')).toBeNull()
    expect(normalizeAiPolishResponse('{"review":"  "}')).toBeNull()
    expect(normalizeAiPolishResponse(null)).toBeNull()
  })
})
