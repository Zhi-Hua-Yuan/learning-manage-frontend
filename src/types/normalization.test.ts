import { describe, expect, it } from 'vitest'
import { DENY_ALL_TASK_CAPABILITIES } from './task'
import {
  normalizeEntityId,
  normalizeCurrentUserWire,
  normalizeNumeric,
  normalizePage,
  normalizeProjectWire,
  normalizeSharedWeeklyReviewWire,
  normalizeTaskAssignmentResult,
  normalizeTaskWire,
  normalizeTaskCapabilities,
  normalizeTeamMemberWire,
  normalizeTeamWire,
  normalizeTeamRole,
} from './normalization'

describe('shared type normalizers', () => {
  it('preserves precise string IDs and rejects unsafe values', () => {
    expect(normalizeEntityId('900719925474099312345')).toBe('900719925474099312345')
    expect(normalizeEntityId(9007199254740991)).toBe('9007199254740991')
    expect(normalizeEntityId(9007199254740992)).toBeNull()
    expect(normalizeEntityId('0')).toBeNull()
    expect(normalizeEntityId('-1')).toBeNull()
    expect(normalizeEntityId(' 101 ')).toBe('101')
    expect(normalizeEntityId('1.5')).toBeNull()
  })

  it('normalizes malformed pagination to safe defaults', () => {
    expect(normalizeNumeric('10', 1, 1)).toBe(10)
    expect(normalizeNumeric('nope', 1, 1)).toBe(1)
    expect(normalizePage({ records: [{ id: 1 }], current: '2', size: 50, total: '100' })).toEqual({
      records: [{ id: 1 }],
      current: 2,
      size: 50,
      total: 100,
    })
    expect(normalizePage(null)).toEqual({ records: [], current: 1, size: 20, total: 0 })
  })

  it('fails closed for missing or malformed task capabilities', () => {
    expect(normalizeTaskCapabilities(undefined)).toBe(DENY_ALL_TASK_CAPABILITIES)
    expect(normalizeTaskCapabilities(null)).toBe(DENY_ALL_TASK_CAPABILITIES)
    expect(normalizeTaskCapabilities([])).toBe(DENY_ALL_TASK_CAPABILITIES)
    expect(normalizeTaskCapabilities({ canAssign: true })).toBe(DENY_ALL_TASK_CAPABILITIES)
    expect(normalizeTaskCapabilities({
      canEditContent: true,
      canChangeStatus: false,
      canReorganize: false,
      canAssign: 'true',
      canDelete: false,
    })).toBe(DENY_ALL_TASK_CAPABILITIES)
    expect(normalizeTaskCapabilities({
      canEditContent: 1,
      canChangeStatus: false,
      canReorganize: false,
      canAssign: false,
      canDelete: false,
    })).toBe(DENY_ALL_TASK_CAPABILITIES)
    expect(normalizeTaskCapabilities({
      canEditContent: true,
      canChangeStatus: false,
      canReorganize: true,
      canAssign: false,
      canDelete: true,
    })).toEqual({
      canEditContent: true,
      canChangeStatus: false,
      canReorganize: true,
      canAssign: false,
      canDelete: true,
    })
  })

  it('does not elevate unknown team roles', () => {
    expect(normalizeTeamRole('MEMBER')).toBe('MEMBER')
    expect(normalizeTeamRole('member')).toBe('UNKNOWN')
    expect(normalizeTeamRole(undefined)).toBe('UNKNOWN')
  })

  it('rejects projects with inconsistent or untrusted scope context', () => {
    expect(normalizeProjectWire({ id: 1, userId: 2, name: 'Personal', scope: 'PERSONAL', teamId: null })).not.toBeNull()
    expect(normalizeProjectWire({ id: 1, userId: 2, name: 'Team', scope: 'TEAM', teamId: 3 })).not.toBeNull()
    expect(normalizeProjectWire({ id: 1, userId: 2, name: 'Legacy personal', teamId: null })).not.toBeNull()
    expect(normalizeProjectWire({ id: 1, userId: 2, name: 'Legacy team', teamId: 3 })).not.toBeNull()
    expect(normalizeProjectWire({ id: 1, userId: 2, name: 'Unknown', scope: 'other', teamId: null })).toBeNull()
    expect(normalizeProjectWire({ id: 1, userId: 2, name: 'Missing team', scope: 'TEAM', teamId: null })).toBeNull()
  })

  it('normalizes user, team and member context without inventing privileges', () => {
    expect(normalizeCurrentUserWire({ id: '1000000000000000001', username: 'Alice', userRole: 'invalid' })).toEqual({
      id: '1000000000000000001', account: '', username: 'Alice', role: 'UNKNOWN',
    })
    expect(normalizeTeamWire({ id: 1, ownerId: 2, name: 'Team' })).toEqual({
      id: '1', ownerId: '2', name: 'Team', description: '', role: 'UNKNOWN',
    })
    expect(normalizeTeamMemberWire({ userId: 2, username: 'Bob', role: 'invalid' }, 1)).toMatchObject({
      teamId: '1', userId: '2', role: 'UNKNOWN',
    })
  })

  it('normalizes task IDs and fails closed while retaining task facts', () => {
    expect(normalizeTaskWire({ id: 1, projectId: 2, createdByUserId: 3, title: 'Task' })).toMatchObject({
      id: '1', projectId: '2', createdByUserId: '3', assigneeUserId: null,
      capabilities: DENY_ALL_TASK_CAPABILITIES,
    })
    expect(normalizeTaskWire({ id: 1, projectId: 2, createdByUserId: 3, assigneeUserId: 'bad' })).toBeNull()
  })

  it('normalizes a complete task assignment result for the expected task', () => {
    expect(normalizeTaskAssignmentResult({
      taskId: 101,
      changed: true,
      previousAssigneeUserId: null,
      assigneeUserId: '202',
      assignedByUserId: 303,
      assignedAt: '2026-09-01T12:00:00',
    }, '101')).toEqual({
      taskId: '101',
      changed: true,
      previousAssigneeUserId: null,
      assigneeUserId: '202',
      assignedByUserId: '303',
      assignedAt: '2026-09-01T12:00:00',
    })
  })

  it('accepts explicit null assignment result fields for an idempotent unassigned task', () => {
    expect(normalizeTaskAssignmentResult({
      taskId: '101',
      changed: false,
      previousAssigneeUserId: null,
      assigneeUserId: null,
      assignedByUserId: null,
      assignedAt: null,
    }, 101)).toEqual({
      taskId: '101',
      changed: false,
      previousAssigneeUserId: null,
      assigneeUserId: null,
      assignedByUserId: null,
      assignedAt: null,
    })
  })

  it('rejects malformed, incomplete or stale task assignment results', () => {
    const valid = {
      taskId: 101,
      changed: true,
      previousAssigneeUserId: null,
      assigneeUserId: 202,
      assignedByUserId: 303,
      assignedAt: null,
    }

    expect(normalizeTaskAssignmentResult(valid, 999)).toBeNull()
    expect(normalizeTaskAssignmentResult({ ...valid, changed: 'true' } as never, 101)).toBeNull()
    expect(normalizeTaskAssignmentResult({ ...valid, assigneeUserId: 0 }, 101)).toBeNull()
    expect(normalizeTaskAssignmentResult({ ...valid, assignedAt: 123 } as never, 101)).toBeNull()
    expect(normalizeTaskAssignmentResult({ ...valid, assignedByUserId: undefined }, 101)).toBeNull()
    expect(normalizeTaskAssignmentResult({
      taskId: 101,
      changed: true,
      previousAssigneeUserId: null,
      assigneeUserId: 202,
      assignedAt: null,
    }, 101)).toBeNull()
    expect(normalizeTaskAssignmentResult({
      taskId: 101,
      changed: true,
      previousAssigneeUserId: null,
      assigneeUserId: 202,
      assignedByUserId: 303,
    }, 101)).toBeNull()
    expect(normalizeTaskAssignmentResult(null, 101)).toBeNull()
  })

  it('keeps shared review normalization on the public whitelist', () => {
    const result = normalizeSharedWeeklyReviewWire({
      id: 1,
      author: { id: 2, username: 'Alice' },
      sharedSummary: 'Summary',
      reflection: 'must not be typed or consumed',
    } as never)
    expect(result).toEqual(expect.objectContaining({ id: '1', sharedSummary: 'Summary' }))
    expect(result).not.toHaveProperty('reflection')
    expect(result).not.toHaveProperty('nextPlan')
    expect(result).not.toHaveProperty('taskIds')
  })
})
