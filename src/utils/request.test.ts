import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AxiosResponse } from 'axios'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  toastPush: vi.fn(),
}))

vi.mock('../router', () => ({
  default: {
    currentRoute: { value: { path: '/tasks' } },
    push: mocks.push,
  },
}))

vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({ push: mocks.toastPush }),
}))

import request, { ApiRequestError } from './request'
import { clearAuthToken, writeAuthToken } from './authToken'

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
    clearAuthToken()
    mocks.push.mockReset()
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
    expect(mocks.push).toHaveBeenCalledWith('/login')
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
