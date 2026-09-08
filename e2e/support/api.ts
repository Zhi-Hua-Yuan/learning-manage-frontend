import { expect, type APIRequestContext } from '@playwright/test'

export interface ApiEnvelope<T> {
  code: number
  message?: string
  data: T
}

export interface AuditIdentity {
  account: string
  username: string
  password: string
}

export interface AuditSession extends AuditIdentity {
  userId: string
  token: string
}

const jsonEnvelope = async <T>(response: Awaited<ReturnType<APIRequestContext['fetch']>>) => {
  const body = (await response.json()) as ApiEnvelope<T>
  expect(response.status(), `HTTP status for ${response.url()}`).toBeLessThan(500)
  expect(body, `JSON envelope for ${response.url()}`).toEqual(
    expect.objectContaining({ code: expect.any(Number) }),
  )
  return body
}

export const uniqueIdentity = (scope: string): AuditIdentity => {
  const seed = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
  const normalizedScope = scope.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4)
  return {
    account: `e2e${normalizedScope}${seed}`.slice(0, 20),
    username: `E2E-${normalizedScope}-${seed.slice(-6)}`.slice(0, 20),
    password: 'AuditPass123!',
  }
}

export const apiCall = async <T>(
  request: APIRequestContext,
  method: string,
  path: string,
  options: { token?: string; data?: unknown; params?: Record<string, string | number | boolean> } = {},
) => {
  const response = await request.fetch(`/api${path}`, {
    method,
    data: options.data,
    params: options.params,
    headers: options.token ? { Authorization: `Bearer ${options.token}` } : undefined,
  })
  return {
    response,
    body: await jsonEnvelope<T>(response),
  }
}

export const registerAndLogin = async (
  request: APIRequestContext,
  scope: string,
): Promise<AuditSession> => {
  const identity = uniqueIdentity(scope)
  const registered = await apiCall<string | number>(request, 'POST', '/user/register', {
    data: {
      account: identity.account,
      username: identity.username,
      password: identity.password,
      confirmPassword: identity.password,
    },
  })
  expect(registered.body.code, registered.body.message).toBe(0)

  const loggedIn = await apiCall<{ id: string | number; token: string }>(request, 'POST', '/user/login', {
    data: { account: identity.account, password: identity.password },
  })
  expect(loggedIn.body.code, loggedIn.body.message).toBe(0)
  expect(loggedIn.body.data.token).toEqual(expect.any(String))

  return {
    ...identity,
    userId: String(loggedIn.body.data.id),
    token: loggedIn.body.data.token,
  }
}

export const createPersonalProject = async (
  request: APIRequestContext,
  token: string,
  name: string,
) => {
  const result = await apiCall<string | number | { id?: string | number; projectId?: string | number }>(
    request,
    'POST',
    '/project/add',
    { token, data: { name } },
  )
  expect(result.body.code, result.body.message).toBe(0)
  const value = result.body.data
  const projectId = typeof value === 'object' && value !== null
    ? (value.id ?? value.projectId)
    : value
  expect(projectId).toBeTruthy()
  return String(projectId)
}
