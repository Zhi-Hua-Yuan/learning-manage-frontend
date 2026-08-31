import { describe, expect, it } from 'vitest'

import type { TaskModel } from '@/types/task'
import type { CurrentUserContext } from '@/types/user'
import type { TeamMemberContext } from '@/types/team'
import { resolveTaskAssigneePresentation } from './taskAssigneePresentation'

const task = (assigneeUserId: string | null): TaskModel => ({
  id: '1',
  projectId: '1',
  milestoneId: null,
  createdByUserId: '1',
  assigneeUserId,
  assignedByUserId: null,
  assignedAt: null,
  title: '任务',
  description: null,
  status: 0,
  priority: 0,
  dueDate: null,
  completedAt: null,
  createTime: null,
  updateTime: null,
  capabilities: {
    canEditContent: false,
    canChangeStatus: false,
    canReorganize: false,
    canAssign: false,
    canDelete: false,
  },
})

const currentUser: CurrentUserContext = {
  id: '7',
  account: 'user-7',
  username: '当前用户',
  role: 'USER',
}

const member = (userId: string, username: string): TeamMemberContext => ({
  teamId: '9',
  userId,
  username,
  role: 'MEMBER',
  joinedAt: null,
})

describe('task assignee presentation', () => {
  it('renders unassigned tasks safely', () => {
    expect(resolveTaskAssigneePresentation({ task: task(null) })).toEqual({
      kind: 'unassigned',
      userId: null,
      label: '未分配',
      description: null,
    })
  })

  it('uses the current user summary without requesting extra fields', () => {
    const result = resolveTaskAssigneePresentation({
      task: task('7'),
      currentUser,
    })

    expect(result.kind).toBe('resolved')
    expect(result.label).toBe('当前用户')
  })

  it('uses a loaded team member summary', () => {
    const result = resolveTaskAssigneePresentation({
      task: task('8'),
      isTeamProject: true,
      teamMembers: [member('8', '团队成员')],
      teamMembersReady: true,
    })

    expect(result.kind).toBe('resolved')
    expect(result.label).toBe('团队成员')
  })

  it('does not call an unloaded member missing an inactive member', () => {
    const result = resolveTaskAssigneePresentation({
      task: task('8'),
      isTeamProject: true,
      teamMembersReady: false,
    })

    expect(result.kind).toBe('unresolved')
    expect(result.label).toBe('用户 #8')
    expect(result.description).toBeNull()
  })

  it('marks a missing member inactive only after a ready team snapshot', () => {
    const result = resolveTaskAssigneePresentation({
      task: task('8'),
      isTeamProject: true,
      teamMembersReady: true,
    })

    expect(result.kind).toBe('inactive')
    expect(result.label).toBe('用户 #8')
    expect(result.description).toContain('已不在当前团队')
  })

  it('falls back to the user id when a username is blank', () => {
    const result = resolveTaskAssigneePresentation({
      task: task('8'),
      teamMembers: [member('8', '   ')],
      teamMembersReady: true,
      isTeamProject: true,
    })

    expect(result.label).toBe('用户 #8')
    expect(result.description).toContain('未提供')
  })
})
