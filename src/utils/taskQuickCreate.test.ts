import { describe, expect, it } from 'vitest'

import {
  buildTaskQuickCreatePayload,
  resolveTaskQuickCreateAccess,
} from './taskQuickCreate'

describe('task quick create contract', () => {
  it('allows personal, owner and admin contexts while failing closed for other roles', () => {
    expect(resolveTaskQuickCreateAccess({ kind: 'personal' }).allowed).toBe(true)
    expect(resolveTaskQuickCreateAccess({ kind: 'team', role: 'OWNER' }).allowed).toBe(true)
    expect(resolveTaskQuickCreateAccess({ kind: 'team', role: 'ADMIN' }).allowed).toBe(true)
    expect(resolveTaskQuickCreateAccess({ kind: 'team', role: 'MEMBER' })).toEqual({
      allowed: false,
      deniedMessage: '当前团队角色不能创建任务。',
    })
    expect(resolveTaskQuickCreateAccess({ kind: 'team', role: 'UNKNOWN' }).allowed).toBe(false)
    expect(resolveTaskQuickCreateAccess({ kind: 'unavailable' }).allowed).toBe(false)
  })

  it('omits assigneeUserId for personal tasks', () => {
    const payload = buildTaskQuickCreatePayload({
      title: '个人任务',
      projectId: '1',
      milestoneId: null,
      context: 'personal',
      assigneeUserId: '9',
    })

    expect(payload).toEqual({
      title: '个人任务',
      projectId: '1',
      priority: 0,
      dueDate: null,
      milestoneId: undefined,
    })
    expect(payload).not.toHaveProperty('assigneeUserId')
  })

  it('keeps an explicit null assignee for unassigned team tasks', () => {
    expect(buildTaskQuickCreatePayload({
      title: '团队任务',
      projectId: '1',
      milestoneId: null,
      context: 'team',
      assigneeUserId: null,
    })).toMatchObject({
      assigneeUserId: null,
    })
  })

  it('submits only the selected team member id and preserves the milestone', () => {
    expect(buildTaskQuickCreatePayload({
      title: '团队任务',
      projectId: '1',
      milestoneId: '8',
      context: 'team',
      assigneeUserId: '2',
    })).toEqual({
      title: '团队任务',
      projectId: '1',
      priority: 0,
      dueDate: null,
      milestoneId: '8',
      assigneeUserId: '2',
    })
  })
})
