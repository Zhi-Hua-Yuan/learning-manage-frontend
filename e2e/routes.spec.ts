import { expect, test } from '@playwright/test'

import { registerAndLogin } from './support/api'

test('核心业务页面可直接加载且不会产生脚本异常', async ({ page, request }, testInfo) => {
  const user = await registerAndLogin(request, `${testInfo.project.name}routes`)
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.addInitScript((token) => localStorage.setItem('token', token), user.token)

  const routes = [
    { path: '/dashboard', text: '数据仪表盘' },
    { path: '/review', text: '周报回顾' },
    { path: '/ai-planner', text: '帮你拆解目标' },
    { path: '/ai-rag', text: 'AI 项目问答' },
    { path: '/ai-agent', text: 'AI 项目分析' },
    { path: '/teams', text: '团队管理' },
    { path: '/settings', text: '个人设置' },
  ]

  for (const route of routes) {
    await page.goto(route.path)
    await expect(page).toHaveURL(new RegExp(`${route.path.replace('/', '\\/')}(?:\\?|$)`))
    await expect(page.getByText(route.text, { exact: route.text !== '帮你拆解目标' }).first()).toBeVisible()
  }

  expect(pageErrors).toEqual([])
})

test('主题切换立即生效并在刷新后保留', async ({ page, request }, testInfo) => {
  const user = await registerAndLogin(request, `${testInfo.project.name}theme`)
  await page.addInitScript((token) => localStorage.setItem('token', token), user.token)
  await page.goto('/settings')

  await page.getByRole('button', { name: '深色' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await page.getByRole('button', { name: '浅色' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})
