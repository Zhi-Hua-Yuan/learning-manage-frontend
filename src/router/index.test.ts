import { beforeEach, describe, expect, it } from 'vitest'

import router from './index'
import { clearAuthToken, writeAuthToken } from '@/utils/authToken'

describe('router authentication guard', () => {
  beforeEach(async () => {
    clearAuthToken()
    await router.push('/login')
  })

  it('redirects unauthenticated users to login', async () => {
    await router.push('/tasks')

    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('redirects authenticated users away from login', async () => {
    writeAuthToken('valid-token')

    await router.push('/tasks')
    await router.push('/login')

    expect(router.currentRoute.value.path).toBe('/tasks')
  })

  it('allows authenticated users to open protected routes', async () => {
    writeAuthToken('valid-token')

    await router.push('/dashboard')

    expect(router.currentRoute.value.path).toBe('/dashboard')
  }, 20000)
})
