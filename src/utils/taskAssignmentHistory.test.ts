import { describe, expect, it } from 'vitest'

import {
  normalizeTaskAssignmentHistoryPage,
  resolveTaskAssignmentActionLabel,
  resolveTaskAssignmentReason,
  resolveTaskAssignmentUserLabel,
} from './taskAssignmentHistory'

const historyRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  taskId: 101,
  action: 'ASSIGN',
  fromAssignee: null,
  toAssignee: { userId: 2, username: 'Alice' },
  assignedBy: { userId: 1, username: 'Owner' },
  reason: 'handoff',
  createTime: '2026-09-01T10:00:00',
  ...overrides,
})

describe('task assignment history normalization and presentation', () => {
  it('normalizes a strict page and keeps only records for the requested task', () => {
    const page = normalizeTaskAssignmentHistoryPage(
      {
        records: [
          historyRecord(),
          historyRecord({ id: 2, taskId: 999 }),
          historyRecord({ id: 1, action: 'REASSIGN' }),
          historyRecord({ id: 'invalid' }),
        ],
        current: '1',
        size: '50',
        total: '4',
      },
      '101',
      { expectedCurrent: 1, expectedSize: 50 },
    )

    expect(page).toMatchObject({ current: 1, size: 50, total: 4 })
    expect(page?.records).toHaveLength(1)
    expect(page?.records[0]).toMatchObject({ id: '1', taskId: '101', action: 'ASSIGN' })
  })

  it('rejects malformed pages and unexpected pagination echoes', () => {
    expect(normalizeTaskAssignmentHistoryPage({ current: 1, size: 50, total: 0 }, 101)).toBeNull()
    expect(
      normalizeTaskAssignmentHistoryPage({ records: [], current: 0, size: 50, total: 0 }, 101),
    ).toBeNull()
    expect(
      normalizeTaskAssignmentHistoryPage({ records: [], current: 1, size: 101, total: 0 }, 101),
    ).toBeNull()
    expect(
      normalizeTaskAssignmentHistoryPage({ records: [], current: 2, size: 50, total: 0 }, 101, {
        expectedCurrent: 1,
        expectedSize: 50,
      }),
    ).toBeNull()
  })

  it('maps every frozen action and safely labels an unknown action', () => {
    expect(resolveTaskAssignmentActionLabel('INITIAL_ASSIGN')).toBe('初始分配')
    expect(resolveTaskAssignmentActionLabel('ASSIGN')).toBe('分配负责人')
    expect(resolveTaskAssignmentActionLabel('REASSIGN')).toBe('转派负责人')
    expect(resolveTaskAssignmentActionLabel('UNASSIGN')).toBe('解除分配')
    expect(resolveTaskAssignmentActionLabel('MEMBER_LEFT')).toBe('成员退出，自动解除')
    expect(resolveTaskAssignmentActionLabel('MEMBER_REMOVED')).toBe('成员被移除，自动解除')
    expect(resolveTaskAssignmentActionLabel('UNKNOWN')).toBe('未知负责人变更')
  })

  it('uses only the whitelisted user summary and degrades missing names safely', () => {
    expect(resolveTaskAssignmentUserLabel({ userId: '2', username: ' Alice ' })).toBe('Alice')
    expect(resolveTaskAssignmentUserLabel({ userId: '2', username: null })).toBe('用户 #2')
    expect(resolveTaskAssignmentUserLabel({ userId: null, username: null })).toBe('未分配')
  })

  it('preserves non-empty reasons as plain data and hides empty reasons', () => {
    const html = '<img src=x onerror=alert(1)>'
    expect(resolveTaskAssignmentReason(html)).toBe(html)
    expect(resolveTaskAssignmentReason('   ')).toBeNull()
    expect(resolveTaskAssignmentReason(null)).toBeNull()
  })
})
