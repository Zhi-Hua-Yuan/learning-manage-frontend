import { describe, expect, it } from 'vitest'

import { getTeamRoleLabel, toggleExpandedTeamId } from './teamNavigation'

describe('team navigation model', () => {
  it('renders frozen team role labels and fails closed for unknown roles', () => {
    expect(getTeamRoleLabel('OWNER')).toBe('所有者')
    expect(getTeamRoleLabel('ADMIN')).toBe('管理员')
    expect(getTeamRoleLabel('MEMBER')).toBe('成员')
    expect(getTeamRoleLabel('UNKNOWN')).toBe('只读')
  })

  it('toggles one team without mutating the previous expansion state', () => {
    const previous = ['1']
    expect(toggleExpandedTeamId(previous, '2')).toEqual(['1', '2'])
    expect(previous).toEqual(['1'])
    expect(toggleExpandedTeamId(previous, '1')).toEqual([])
  })
})
