import { expect, test } from '@playwright/test'

import { apiCall, createPersonalProject, registerAndLogin, uniqueIdentity } from './support/api'

test('BUG-AUDIT-003 同账号并发注册不应产生系统错误', async ({ request }, testInfo) => {
  const identity = uniqueIdentity(`${testInfo.project.name}race`)
  const attempts = await Promise.all(
    Array.from({ length: 8 }, () => request.post('/api/user/register', {
      data: {
        account: identity.account,
        username: identity.username,
        password: identity.password,
        confirmPassword: identity.password,
      },
    })),
  )
  const results = await Promise.all(attempts.map(async (response) => ({
    status: response.status(),
    body: await response.json() as { code?: number },
  })))

  expect(results.filter(({ body }) => body.code === 0)).toHaveLength(1)
  expect(results.every(({ status, body }) => status < 500 && body.code !== 50000)).toBe(true)
})

test('BUG-AUDIT-004 并发创建项目应生成唯一且连续的排序号', async ({ request }, testInfo) => {
  const user = await registerAndLogin(request, `${testInfo.project.name}order`)
  const prefix = `并发排序-${Date.now().toString(36).slice(-6)}-`
  const created = await Promise.all(
    Array.from({ length: 12 }, (_, index) => createPersonalProject(request, user.token, `${prefix}${index}`)),
  )
  expect(new Set(created).size).toBe(12)

  const listed = await apiCall<{ records?: Array<{ name?: string; orderNo?: number }> }>(
    request,
    'GET',
    '/project/list',
    { token: user.token, params: { status: 0, pageNum: 1, pageSize: 100 } },
  )
  expect(listed.body.code, listed.body.message).toBe(0)
  const auditProjects = (listed.body.data.records ?? []).filter(({ name }) => name?.startsWith(prefix))
  const orderNumbers = auditProjects.map(({ orderNo }) => orderNo)
  expect(auditProjects).toHaveLength(12)
  expect(new Set(orderNumbers).size).toBe(12)
})

test('BUG-AUDIT-005 删除末尾里程碑后应能创建替代里程碑', async ({ request }, testInfo) => {
  const user = await registerAndLogin(request, `${testInfo.project.name}mile`)
  const projectId = await createPersonalProject(request, user.token, `阶段重建-${Date.now().toString(36).slice(-6)}`)

  const first = await apiCall<string | number>(request, 'POST', '/milestone/add', {
    token: user.token,
    data: { projectId, name: '阶段一' },
  })
  const second = await apiCall<string | number>(request, 'POST', '/milestone/add', {
    token: user.token,
    data: { projectId, name: '阶段二' },
  })
  expect(first.body.code, first.body.message).toBe(0)
  expect(second.body.code, second.body.message).toBe(0)

  const deleted = await apiCall<boolean>(request, 'POST', `/milestone/delete/${second.body.data}`, {
    token: user.token,
  })
  expect(deleted.body.code, deleted.body.message).toBe(0)

  const replacement = await apiCall<string | number>(request, 'POST', '/milestone/add', {
    token: user.token,
    data: { projectId, name: '替代阶段' },
  })
  expect(replacement.response.status()).toBeLessThan(500)
  expect(replacement.body.code, replacement.body.message).toBe(0)
})
