import { expect, test } from '@playwright/test'

import { apiCall, createPersonalProject, registerAndLogin } from './support/api'

test('个人项目任务可创建并在刷新后恢复', async ({ page, request }, testInfo) => {
  const session = await registerAndLogin(request, `${testInfo.project.name}core`)
  const suffix = Date.now().toString(36).slice(-6)
  const projectName = `审计清单-${suffix}`
  const taskTitle = `审计任务-${suffix}`
  const projectId = await createPersonalProject(request, session.token, projectName)

  await page.addInitScript((token) => localStorage.setItem('token', token), session.token)
  await page.goto(`/tasks?projectId=${encodeURIComponent(projectId)}`)

  await expect(page.getByText(projectName, { exact: true }).first()).toBeVisible()
  const quickCreate = page.getByPlaceholder('输入任务标题（最多 50 字），按回车保存，Tab 选择所属阶段')
  await quickCreate.fill(taskTitle)
  await quickCreate.press('Enter')
  await expect(page.getByText(taskTitle, { exact: true }).first()).toBeVisible()

  const listed = await apiCall<{ records?: Array<{ title?: string }> }>(request, 'GET', '/task/list', {
    token: session.token,
    params: { projectId, current: 1, size: 100 },
  })
  expect(listed.body.code, listed.body.message).toBe(0)
  expect(listed.body.data.records?.some((task) => task.title === taskTitle)).toBe(true)

  await page.reload()
  await expect(page.getByText(taskTitle, { exact: true }).first()).toBeVisible()
})

test('跨用户直接访问或修改他人项目会被拒绝', async ({ request }, testInfo) => {
  const owner = await registerAndLogin(request, `${testInfo.project.name}own`)
  const outsider = await registerAndLogin(request, `${testInfo.project.name}out`)
  const projectName = `隔离清单-${Date.now().toString(36).slice(-6)}`
  const projectId = await createPersonalProject(request, owner.token, projectName)

  const reads = await apiCall<unknown>(request, 'GET', `/project/get/${projectId}`, {
    token: outsider.token,
  })
  expect(reads.body.code).not.toBe(0)

  const updates = await apiCall<unknown>(request, 'POST', '/project/update', {
    token: outsider.token,
    data: { id: projectId, name: '越权修改' },
  })
  expect(updates.body.code).not.toBe(0)

  const deletes = await apiCall<unknown>(request, 'POST', `/project/delete/${projectId}`, {
    token: outsider.token,
  })
  expect(deletes.body.code).not.toBe(0)

  const ownerRead = await apiCall<{ name?: string }>(request, 'GET', `/project/get/${projectId}`, {
    token: owner.token,
  })
  expect(ownerRead.body.code, ownerRead.body.message).toBe(0)
  expect(ownerRead.body.data.name).toBe(projectName)
})

test('普通用户不能读取系统管理员运维数据', async ({ request }, testInfo) => {
  const user = await registerAndLogin(request, `${testInfo.project.name}ops`)
  const result = await apiCall<unknown>(request, 'GET', '/admin/ai/ops/overview', {
    token: user.token,
  })

  expect(result.body.code).not.toBe(0)
  expect(JSON.stringify(result.body)).not.toMatch(/bug-audit-(?:jwt|redis|rag)|password|api[-_]?key/i)
})
