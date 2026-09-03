import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, type AxiosResponse } from 'axios'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  toastPush: vi.fn(),
}))

vi.mock('../router', () => ({
  default: {
    currentRoute: { value: { path: '/tasks' } },
    push: mocks.push,
    replace: mocks.replace,
  },
}))

vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({ push: mocks.toastPush }),
}))

import request, { ApiRequestError, classifyApiError } from './request'
import { logoutApi } from '@/api/user'
import { clearAuthToken, writeAuthToken } from './authToken'
import { setActiveCacheActor } from './cacheActor'
import { resetProtectedSessionState } from './sessionLifecycle'

const setResponse = (data: unknown, status = 200) => {
  request.defaults.adapter = async (config) => {
    const response: AxiosResponse = {
      data,
      status,
      statusText: 'OK',
      headers: {},
      config,
    }
    return response
  }
}

describe('request client', () => {
  beforeEach(() => {
    resetProtectedSessionState('ACTOR_CHANGED')
    clearAuthToken()
    mocks.push.mockReset()
    mocks.replace.mockReset()
    mocks.toastPush.mockReset()
    setResponse({ code: 0, data: null })
  })

  it('adds a bearer token to protected requests and unwraps data', async () => {
    writeAuthToken('abc123')
    let authorization: unknown
    request.defaults.adapter = async (config) => {
      authorization = config.headers?.Authorization
      return {
        data: { code: 0, data: { ok: true } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }
    }

    await expect(request.get('/projects')).resolves.toEqual({ ok: true })
    expect(authorization).toBe('Bearer abc123')
  })

  it('does not attach a token to public auth endpoints', async () => {
    writeAuthToken('abc123')
    let authorization: unknown
    request.defaults.adapter = async (config) => {
      authorization = config.headers?.Authorization
      return {
        data: { code: 0, data: { token: 'new-token' } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }
    }

    await expect(request.post('/user/login')).resolves.toEqual({ token: 'new-token' })
    expect(authorization).toBeUndefined()
  })

  it('turns non-zero business responses into ApiRequestError', async () => {
    setResponse({ code: 400, message: '参数错误', data: null })

    await expect(request.get('/projects')).rejects.toMatchObject({
      name: 'ApiRequestError',
      code: 400,
      message: '参数错误',
    })
  })

  it('clears auth state and redirects on protected auth errors', async () => {
    writeAuthToken('expired-token')
    setResponse({ code: 401, message: '登录已失效', data: null })

    await expect(request.get('/projects')).rejects.toBeInstanceOf(ApiRequestError)
    expect(window.localStorage.getItem('token')).toBeNull()
    expect(mocks.toastPush).toHaveBeenCalledWith({ type: 'error', message: '登录已过期，请重新登录。' })
    expect(mocks.replace).toHaveBeenCalledWith('/login')
  })

  it('clears protected actor resources and session operations on HTTP 401', async () => {
    setActiveCacheActor('7')
    writeAuthToken('expired-token')
    window.localStorage.setItem('tick:cache:task-list:v1:1:actor-7', 'tasks')
    window.localStorage.setItem('tick_aiPlannerDraft_v1:actor-7', 'draft')
    window.localStorage.setItem('tick_themeMode', 'dark')
    window.sessionStorage.setItem('ai:draft:confirm-operation:9:actor-7', 'operation')
    setResponse({ code: 40100, message: '登录已失效', data: null }, 401)

    await expect(request.get('/projects')).rejects.toBeInstanceOf(ApiRequestError)

    expect(window.localStorage.getItem('token')).toBeNull()
    expect(window.localStorage.getItem('tick:cache:task-list:v1:1:actor-7')).toBeNull()
    expect(window.localStorage.getItem('tick_aiPlannerDraft_v1:actor-7')).toBeNull()
    expect(window.sessionStorage.getItem('ai:draft:confirm-operation:9:actor-7')).toBeNull()
    expect(window.localStorage.getItem('tick_themeMode')).toBe('dark')
  })

  it('does not terminate the session for HTTP 403 permission responses', async () => {
    writeAuthToken('valid-token')
    setResponse({ code: 40300, message: '没有权限', data: null }, 403)

    await expect(request.get('/projects')).rejects.toMatchObject({
      name: 'ApiRequestError',
      code: 40300,
      httpStatus: 403,
    })
    expect(window.localStorage.getItem('token')).toBe('valid-token')
    expect(mocks.replace).not.toHaveBeenCalled()
    expect(mocks.toastPush).not.toHaveBeenCalled()
  })

  it('does not terminate the session for an HTML 403 gateway response', async () => {
    writeAuthToken('valid-token')
    setResponse('<html><body>403 Forbidden</body></html>', 403)

    await expect(request.get('/projects')).rejects.toMatchObject({
      name: 'ApiRequestError',
      httpStatus: 403,
    })
    expect(window.localStorage.getItem('token')).toBe('valid-token')
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it('keeps local-auth requests from terminating the active session', async () => {
    writeAuthToken('valid-token')
    setResponse({ code: 40100, message: '登录已失效', data: null }, 401)

    await expect(request.post('/user/logout', undefined, { authFailureMode: 'LOCAL' })).rejects.toMatchObject({
      name: 'ApiRequestError',
      code: 40100,
      httpStatus: 401,
    })
    expect(window.localStorage.getItem('token')).toBe('valid-token')
    expect(mocks.replace).not.toHaveBeenCalled()
    expect(mocks.toastPush).not.toHaveBeenCalled()
  })

  it('sends a captured logout credential with local auth failure handling', async () => {
    let requestConfig: Record<string, unknown> = {}
    request.defaults.adapter = async (config) => {
      requestConfig = config as unknown as Record<string, unknown>
      return {
        data: { code: 0, data: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }
    }

    await expect(logoutApi('old-token')).resolves.toBe(true)

    expect(requestConfig.authFailureMode).toBe('LOCAL')
    const headers = requestConfig.headers as Record<string, unknown> | undefined
    expect(headers?.Authorization).toBe('Bearer old-token')
  })

  it('lets the HTTP status win when transport and business auth signals conflict', async () => {
    writeAuthToken('valid-token')
    setResponse({ code: 40300, message: '没有权限', data: null }, 401)

    await expect(request.get('/projects')).rejects.toMatchObject({ httpStatus: 401 })
    expect(window.localStorage.getItem('token')).toBeNull()
    expect(mocks.replace).toHaveBeenCalledTimes(1)
  })

  it('keeps the session when an HTTP 403 wraps an authentication business code', async () => {
    writeAuthToken('valid-token')
    setResponse({ code: 40100, message: '登录已失效', data: null }, 403)

    await expect(request.get('/projects')).rejects.toMatchObject({ httpStatus: 403 })
    expect(window.localStorage.getItem('token')).toBe('valid-token')
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it('lets the HTTP status win when HTML body and transport status conflict', async () => {
    writeAuthToken('valid-token')
    setResponse('<html><body>401 Unauthorized</body></html>', 403)

    await expect(request.get('/projects')).rejects.toMatchObject({ httpStatus: 403 })
    expect(window.localStorage.getItem('token')).toBe('valid-token')
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it('performs authentication side effects only once for concurrent HTTP 401 responses', async () => {
    writeAuthToken('expired-token')
    request.defaults.adapter = async (config) => {
      throw new AxiosError(
        'Request failed with status code 401',
        'ERR_BAD_REQUEST',
        config,
        undefined,
        {
          data: { code: 40100, message: '登录已失效', data: null },
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config,
        },
      )
    }

    const results = await Promise.allSettled([
      request.get('/projects'),
      request.get('/tasks'),
    ])

    expect(results.every((result) => result.status === 'rejected')).toBe(true)
    expect(window.localStorage.getItem('token')).toBeNull()
    expect(mocks.replace).toHaveBeenCalledTimes(1)
    expect(mocks.toastPush).toHaveBeenCalledTimes(1)
  })

  it('keeps public auth errors local to the login request', async () => {
    writeAuthToken('existing-token')
    setResponse({ code: 401, message: '账号或密码错误', data: null })

    await expect(request.post('/user/login')).rejects.toMatchObject({
      code: 401,
      message: '账号或密码错误',
    })
    expect(window.localStorage.getItem('token')).toBe('existing-token')
    expect(mocks.push).not.toHaveBeenCalled()
    expect(mocks.toastPush).not.toHaveBeenCalled()
  })

  it('returns non-envelope response payloads unchanged', async () => {
    setResponse([{ id: 1 }])

    await expect(request.get('/projects')).resolves.toEqual([{ id: 1 }])
  })
})

describe('classifyApiError', () => {
  it('classifies assignment operation errors as conflicts before generic server errors', () => {
    expect(classifyApiError(new ApiRequestError('负责人已变化', {
      code: 50001,
      httpStatus: 200,
    }))).toBe('CONFLICT')
    expect(classifyApiError(new ApiRequestError('负责人已被其他请求更新', {
      code: 50001,
      httpStatus: 500,
    }))).toBe('CONFLICT')
  })

  it('preserves the existing authentication, permission and server classifications', () => {
    expect(classifyApiError(new ApiRequestError('冲突', { code: 40900 }))).toBe('CONFLICT')
    expect(classifyApiError(new ApiRequestError('无权限', {
      code: 40300,
      httpStatus: 403,
    }))).toBe('PERMISSION_DENIED')
    expect(classifyApiError(new ApiRequestError('未登录', { code: 40100 }))).toBe('AUTHENTICATION_REQUIRED')
    expect(classifyApiError(new ApiRequestError('参数错误', { code: 40000 }))).toBe('VALIDATION')
    expect(classifyApiError(new ApiRequestError('系统错误', {
      code: 50000,
      httpStatus: 500,
    }))).toBe('SERVER')
  })
})
