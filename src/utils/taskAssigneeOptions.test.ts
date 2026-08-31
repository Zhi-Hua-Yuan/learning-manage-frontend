import { describe, expect, it } from 'vitest'

import type { TeamMemberContext } from '@/types/team'
import type { CurrentUserContext } from '@/types/user'
import {
  buildPersonalTaskAssigneeOptions,
  buildTeamTaskAssigneeOptions,
  getTaskAssigneeRoleLabel,
} from './taskAssigneeOptions'

const member = (overrides: Partial<TeamMemberContext> = {}): TeamMemberContext => ({
  teamId: '9',
  userId: '8',
  username: '团队成员',
  role: 'MEMBER',
  joinedAt: null,
  ...overrides,
})

const currentUser: CurrentUserContext = {
  id: '7',
  account: 'user-7',
  username: '当前用户',
  role: 'USER',
}

describe('task assignee options', () => {
  it('puts unassigned first and filters to the requested team', () => {
    const options = buildTeamTaskAssigneeOptions('9', [
      member({ userId: '10', username: '成员 B' }),
      member({ userId: '11', teamId: '10', username: '其他团队' }),
      member({ userId: '9', username: '成员 A', role: 'ADMIN' }),
    ])

    expect(options.map((option) => option.value)).toEqual([null, '9', '10'])
  })

  it('deduplicates ids and safely falls back for blank usernames', () => {
    const options = buildTeamTaskAssigneeOptions('9', [
      member({ userId: '8', username: '  ' }),
      member({ userId: '8', username: '重复成员' }),
    ])

    expect(options).toHaveLength(2)
    expect(options[1]?.label).toBe('用户 #8')
  })

  it('sorts members by role, then label and id', () => {
    const options = buildTeamTaskAssigneeOptions('9', [
      member({ userId: '3', username: '成员', role: 'MEMBER' }),
      member({ userId: '2', username: '管理员', role: 'ADMIN' }),
      member({ userId: '1', username: '所有者', role: 'OWNER' }),
    ])

    expect(options.map((option) => option.value)).toEqual([null, '1', '2', '3'])
  })

  it('does not mutate the member input', () => {
    const members = [member({ userId: '2' }), member({ userId: '1' })]
    const snapshot = members.map((value) => value.userId)
    buildTeamTaskAssigneeOptions('9', members)
    expect(members.map((value) => value.userId)).toEqual(snapshot)
  })

  it('returns only the current user for personal projects', () => {
    const options = buildPersonalTaskAssigneeOptions(currentUser)
    expect(options).toHaveLength(1)
    expect(options[0]).toMatchObject({ value: '7', label: '当前用户', kind: 'current-user' })
  })

  it('returns no personal option without a valid current user', () => {
    expect(buildPersonalTaskAssigneeOptions(null)).toEqual([])
  })

  it('maps unknown roles to the safe member label', () => {
    expect(getTaskAssigneeRoleLabel('UNKNOWN')).toBe('成员')
    expect(getTaskAssigneeRoleLabel(null)).toBeNull()
  })
})
