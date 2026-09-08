import { expect, test } from '@playwright/test'

import { apiCall, registerAndLogin } from './support/api'

test('BUG-AUDIT-002 业务异常应使用约定的 HTTP 状态码', async ({ request }, testInfo) => {
  const unauthenticated = await request.get('/api/user/me')
  expect.soft(unauthenticated.status(), '未登录应返回 HTTP 401').toBe(401)

  const invalid = await request.post('/api/user/register', {
    data: { account: '', username: '无效用户', password: 'AuditPass123!', confirmPassword: 'AuditPass123!' },
  })
  expect.soft(invalid.status(), '参数错误应返回 HTTP 400').toBe(400)

  const user = await registerAndLogin(request, `${testInfo.project.name}http`)
  const forbidden = await apiCall<unknown>(request, 'GET', '/admin/ai/ops/overview', {
    token: user.token,
  })
  expect.soft(forbidden.response.status(), '权限不足应返回 HTTP 403').toBe(403)
})
