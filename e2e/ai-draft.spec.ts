import { expect, test } from '@playwright/test'

import { apiCall, registerAndLogin } from './support/api'

test('AI 拆解草稿可恢复、取消且不可在取消后确认', async ({ request }, testInfo) => {
  const user = await registerAndLogin(request, `${testInfo.project.name}draft`)
  const preview = await apiCall<{ draftId?: string; status?: string }>(
    request,
    'POST',
    '/ai/breakdown/preview',
    {
      token: user.token,
      data: { target: '完成端到端审计', duration: '2周', detailed: false },
    },
  )
  expect(preview.body.code, preview.body.message).toBe(0)
  const draftId = preview.body.data.draftId
  expect(draftId).toBeTruthy()

  const detail = await apiCall<{ draftId?: string; status?: string }>(
    request,
    'GET',
    `/ai/draft/${encodeURIComponent(String(draftId))}`,
    { token: user.token },
  )
  expect(detail.body.code, detail.body.message).toBe(0)
  expect(detail.body.data.draftId).toBe(draftId)

  const canceled = await apiCall<boolean>(request, 'POST', '/ai/draft/cancel', {
    token: user.token,
    data: { draftId },
  })
  expect(canceled.body.code, canceled.body.message).toBe(0)

  const confirmAfterCancel = await apiCall<unknown>(request, 'POST', '/ai/breakdown/confirm', {
    token: user.token,
    data: {
      draftId,
      operationId: `cancel-confirm-${Date.now().toString(36)}`,
      projectName: '不应创建的项目',
    },
  })
  expect(confirmAfterCancel.body.code).not.toBe(0)

  const projects = await apiCall<{ records?: Array<{ name?: string }> }>(
    request,
    'GET',
    '/project/list',
    { token: user.token, params: { status: 0, pageNum: 1, pageSize: 100 } },
  )
  expect(projects.body.code, projects.body.message).toBe(0)
  expect(projects.body.data.records?.some((project) => project.name === '不应创建的项目')).toBe(false)
})
