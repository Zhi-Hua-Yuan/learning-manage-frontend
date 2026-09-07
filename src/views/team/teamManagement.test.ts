import { describe, expect, it } from 'vitest'

import type { TeamMemberContext, TeamRole } from '@/types/team'
import teamManagementSource from './TeamManagement.vue?raw'
import {
  canChangeTeamMemberRole,
  canLoadTeamMembers,
  canRemoveTeamMember,
  getTeamMemberSummary,
} from './teamManagement'

const member = (userId: string, role: TeamRole): TeamMemberContext => ({
  teamId: '7', userId, username: userId, role, joinedAt: null,
})

describe('team management permission presentation', () => {
  it('lets only owners change non-owner roles', () => {
    expect(canChangeTeamMemberRole('OWNER', '1', member('2', 'MEMBER'))).toBe(true)
    expect(canChangeTeamMemberRole('ADMIN', '1', member('2', 'MEMBER'))).toBe(false)
    expect(canChangeTeamMemberRole('OWNER', '1', member('1', 'OWNER'))).toBe(false)
  })

  it('matches the backend removal matrix', () => {
    expect(canRemoveTeamMember('OWNER', '1', member('2', 'ADMIN'))).toBe(true)
    expect(canRemoveTeamMember('ADMIN', '1', member('2', 'MEMBER'))).toBe(true)
    expect(canRemoveTeamMember('ADMIN', '1', member('2', 'ADMIN'))).toBe(false)
    expect(canRemoveTeamMember('MEMBER', '1', member('2', 'MEMBER'))).toBe(false)
    expect(canRemoveTeamMember('OWNER', '1', member('1', 'OWNER'))).toBe(false)
  })

  it('waits for the current actor and selected team context before loading members', () => {
    expect(canLoadTeamMembers({
      currentUserId: '', teamsStatus: 'loading', selectedTeamId: '7', availableTeamId: '',
    })).toBe(false)
    expect(canLoadTeamMembers({
      currentUserId: '1', teamsStatus: 'ready', selectedTeamId: '7', availableTeamId: '7',
    })).toBe(true)
    expect(canLoadTeamMembers({
      currentUserId: '2', teamsStatus: 'ready', selectedTeamId: '7', availableTeamId: '8',
    })).toBe(false)
  })

  it('does not report zero members before a successful response', () => {
    expect(getTeamMemberSummary('loading', 0)).toBe('正在加载成员…')
    expect(getTeamMemberSummary('error', 0)).toBe('成员加载失败')
    expect(getTeamMemberSummary('ready', 2)).toBe('2 名有效成员')
    expect(getTeamMemberSummary('ready', 0)).toBe('0 名有效成员')
  })

  it('binds leave confirmation to the captured team and closes it after commit', () => {
    expect(teamManagementSource).toContain('const leavingTeamId = pendingLeaveTeamId.value')
    expect(teamManagementSource).toMatch(
      /await collaboration\.leaveTeam\(leavingTeamId\)[\s\S]*showLeaveConfirm\.value = false/,
    )
    expect(teamManagementSource).not.toContain('collaboration.leaveTeam(selectedTeamId.value)')
  })
})
