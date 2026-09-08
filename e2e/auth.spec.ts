import { expect, test } from '@playwright/test'

import { uniqueIdentity } from './support/api'

test('未登录访问业务页会跳转登录 @smoke', async ({ page }) => {
  await page.goto('/tasks')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: '欢迎使用智径' })).toBeVisible()
})

test('注册、登录、刷新和退出形成完整会话闭环 @smoke', async ({ page }, testInfo) => {
  const identity = uniqueIdentity(testInfo.project.name)

  await page.goto('/login')
  await page.getByRole('button', { name: '没有账号？点击注册' }).click()
  await page.getByPlaceholder('请输入账号').fill(identity.account)
  await page.getByPlaceholder('请输入昵称').fill(identity.username)
  await page.getByPlaceholder('请输入密码').fill(identity.password)
  await page.getByPlaceholder('请再次输入密码').fill(identity.password)
  await page.getByRole('button', { name: '注 册' }).click()

  await expect(page.getByRole('button', { name: '登 录' })).toBeVisible()
  await page.getByPlaceholder('请输入账号').fill(identity.account)
  await page.getByPlaceholder('请输入密码').fill(identity.password)
  await page.getByRole('button', { name: '登 录' }).click()

  await expect(page).toHaveURL(/\/tasks(?:\?|$)/)
  await expect(page.getByText(identity.username, { exact: true })).toBeVisible()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('token'))).not.toBeNull()

  await page.reload()
  await expect(page).toHaveURL(/\/tasks(?:\?|$)/)
  await expect(page.getByText(identity.username, { exact: true })).toBeVisible()

  const openSidebar = page.getByRole('button', { name: '打开侧栏' })
  if (await openSidebar.isVisible()) {
    await openSidebar.click()
  }
  await page.getByText(identity.username, { exact: true }).click()
  await page.getByText('退出登录', { exact: true }).first().click()
  await page.getByRole('button', { name: '退出登录' }).click()

  await expect(page).toHaveURL(/\/login$/)
  await expect.poll(() => page.evaluate(() => localStorage.getItem('token'))).toBeNull()
})
