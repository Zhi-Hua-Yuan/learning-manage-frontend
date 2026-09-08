import { expect, test } from '@playwright/test'

import { apiCall, registerAndLogin } from './support/api'

test('团队加入、共享周复盘隐私和成员退出后的任务解绑保持一致', async ({ request }, testInfo) => {
  const owner = await registerAndLogin(request, `${testInfo.project.name}teamown`)
  const member = await registerAndLogin(request, `${testInfo.project.name}teammem`)
  const suffix = Date.now().toString(36).slice(-6)

  const createdTeam = await apiCall<{ teamId?: string | number; inviteCode?: string }>(
    request,
    'POST',
    '/team/create',
    { token: owner.token, data: { name: `审计团队-${suffix}`, description: 'E2E audit' } },
  )
  expect(createdTeam.body.code, createdTeam.body.message).toBe(0)
  const teamId = String(createdTeam.body.data.teamId)
  const inviteCode = createdTeam.body.data.inviteCode
  expect(teamId).not.toBe('undefined')
  expect(inviteCode).toBeTruthy()

  const joined = await apiCall<boolean>(request, 'POST', '/team/join', {
    token: member.token,
    data: { inviteCode },
  })
  expect(joined.body.code, joined.body.message).toBe(0)

  const createdProject = await apiCall<string | number>(request, 'POST', '/project/team/create', {
    token: owner.token,
    data: { teamId, name: `团队清单-${suffix}`, goal: '验证权限与隐私' },
  })
  expect(createdProject.body.code, createdProject.body.message).toBe(0)
  const projectId = String(createdProject.body.data)

  const createdTask = await apiCall<string | number>(request, 'POST', '/task/add', {
    token: owner.token,
    data: {
      projectId,
      title: `成员任务-${suffix}`,
      assigneeUserId: member.userId,
      priority: 2,
    },
  })
  expect(createdTask.body.code, createdTask.body.message).toBe(0)
  const taskId = String(createdTask.body.data)

  const privateReflection = `仅作者反思-${suffix}`
  const privateNextPlan = `仅作者计划-${suffix}`
  const sharedSummary = `团队共享摘要-${suffix}`
  const saved = await apiCall<boolean>(request, 'POST', '/review/save', {
    token: owner.token,
    data: {
      year: 2026,
      weekNo: 36,
      visibilityScope: 'TEAM',
      teamId,
      focusProjectId: projectId,
      reflection: privateReflection,
      nextPlan: privateNextPlan,
      sharedSummary,
      taskIds: [taskId],
    },
  })
  expect(saved.body.code, saved.body.message).toBe(0)

  const feed = await apiCall<{ records?: Array<Record<string, unknown>> }>(
    request,
    'GET',
    '/review/team',
    { token: member.token, params: { teamId, current: 1, size: 20 } },
  )
  expect(feed.body.code, feed.body.message).toBe(0)
  const shared = feed.body.data.records?.find((item) => item.sharedSummary === sharedSummary)
  expect(shared).toBeTruthy()
  expect(shared).not.toHaveProperty('reflection')
  expect(shared).not.toHaveProperty('nextPlan')
  expect(shared).not.toHaveProperty('taskIds')
  expect(JSON.stringify(shared)).not.toContain(privateReflection)
  expect(JSON.stringify(shared)).not.toContain(privateNextPlan)

  const left = await apiCall<{ unassignedTaskCount?: number }>(
    request,
    'POST',
    `/team/${teamId}/leave`,
    { token: member.token },
  )
  expect(left.body.code, left.body.message).toBe(0)
  expect(left.body.data.unassignedTaskCount).toBe(1)

  const taskAfterLeave = await apiCall<{ assigneeUserId?: string | number | null }>(
    request,
    'GET',
    `/task/get/${taskId}`,
    { token: owner.token },
  )
  expect(taskAfterLeave.body.code, taskAfterLeave.body.message).toBe(0)
  expect(taskAfterLeave.body.data.assigneeUserId).toBeNull()

  const feedAfterLeave = await apiCall<unknown>(request, 'GET', '/review/team', {
    token: member.token,
    params: { teamId, current: 1, size: 20 },
  })
  expect(feedAfterLeave.body.code).not.toBe(0)
})
