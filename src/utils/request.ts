import axios from 'axios'
import router from '../router' // 引入路由用于跳转
import { useToastStore } from '@/stores/toast'
import { readAuthToken } from '@/utils/authToken'
import { syncBackendCacheVersion } from '@/utils/cacheVersion'
import { terminateAuthenticatedSession } from '@/utils/sessionLifecycle'

export interface ApiRequestErrorOptions {
  code?: number | null
  httpStatus?: number | null
  traceId?: string | null
}

export class ApiRequestError extends Error {
  readonly code: number | null
  readonly httpStatus: number | null
  readonly traceId: string | null

  constructor(message: string, options: ApiRequestErrorOptions = {}) {
    super(message)
    this.name = 'ApiRequestError'
    this.code = options.code ?? null
    this.httpStatus = options.httpStatus ?? null
    this.traceId = options.traceId ?? null
  }
}

export const isApiRequestError = (error: unknown): error is ApiRequestError => {
  return error instanceof ApiRequestError
}

export type ApiErrorKind =
  | 'AUTHENTICATION_REQUIRED'
  | 'PERMISSION_DENIED'
  | 'CONFLICT'
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'SERVER'
  | 'NETWORK'
  | 'UNKNOWN'

const request = axios.create({
  baseURL: '/api',
  timeout: 300000,
})

export type AuthFailureMode = 'GLOBAL' | 'LOCAL'

const PUBLIC_AUTH_PATHS = new Set(['/user/login', '/user/register'])

const normalizeRequestPath = (url: string) => {
  try {
    const pathname = new URL(url, 'http://learningmanage.local').pathname
    return pathname.replace(/^\/api(?=\/|$)/, '') || '/'
  } catch {
    return url.split(/[?#]/, 1)[0] || '/'
  }
}

const isPublicAuthPath = (url: unknown) => {
  if (typeof url !== 'string' || !url) return false
  return PUBLIC_AUTH_PATHS.has(normalizeRequestPath(url).toLowerCase())
}

const isLocalAuthFailureRequest = (config: { url?: string; authFailureMode?: AuthFailureMode } | null | undefined) => (
  config?.authFailureMode === 'LOCAL' || isPublicAuthPath(config?.url)
)

const resolveBusinessMessage = (res: unknown) => {
  if (!res || typeof res !== 'object') return ''
  const record = res as Record<string, unknown>

  const candidates = [record.message, record.msg, record.errorMessage, record.error]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }

  return ''
}

const resolveBusinessCode = (res: unknown): number | null => {
  if (!res || typeof res !== 'object') return null
  const rawCode = (res as Record<string, unknown>).code
  const code = Number(rawCode)
  return Number.isFinite(code) ? code : null
}

const resolveHttpStatus = (status: unknown): number | null => {
  const parsed = Number(status)
  return Number.isFinite(parsed) ? parsed : null
}

const MAX_TRACE_ID_LENGTH = 128

export const normalizeTraceId = (value: unknown): string | null => {
  if (Array.isArray(value)) return normalizeTraceId(value[0])
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const normalized = String(value).trim()
  if (!normalized || normalized.length > MAX_TRACE_ID_LENGTH) return null
  return normalized
}

export const resolveTraceId = (headers: unknown): string | null => {
  if (!headers || typeof headers !== 'object') return null
  const headerRecord = headers as Record<string, unknown> & { get?: (name: string) => unknown }
  if (typeof headerRecord.get === 'function') {
    const value = normalizeTraceId(headerRecord.get('x-trace-id'))
    if (value) return value
  }
  const entry = Object.entries(headerRecord).find(([name]) => name.toLowerCase() === 'x-trace-id')
  return normalizeTraceId(entry?.[1])
}

const createApiRequestError = (
  message: string,
  options: ApiRequestErrorOptions = {},
): ApiRequestError => {
  return new ApiRequestError(message, options)
}

type HtmlAccessErrorKind = 'AUTHENTICATION_REQUIRED' | 'PERMISSION_DENIED' | null

const resolvePublicAuthHtmlMessage = (kind: Exclude<HtmlAccessErrorKind, null>) => {
  return kind === 'PERMISSION_DENIED'
    ? '登录接口被拒绝（403），请检查网关或后端鉴权配置。'
    : '登录接口未通过认证（401），请检查网关或后端鉴权配置。'
}

const classifyHtmlAccessError = (value: unknown, status: number | null): HtmlAccessErrorKind => {
  if (typeof value !== 'string') return null
  const normalized = value.toLowerCase()
  if (!normalized.includes('<html')) return null
  if (status === 401) return 'AUTHENTICATION_REQUIRED'
  if (status === 403) return 'PERMISSION_DENIED'
  if (status !== null && (status < 200 || status >= 300)) return null
  if (normalized.includes('401 unauthorized')) return 'AUTHENTICATION_REQUIRED'
  if (normalized.includes('403 forbidden') || normalized.includes('access denied')) {
    return 'PERMISSION_DENIED'
  }
  return null
}

const isPermissionBusinessError = (res: unknown, status: number | null = null) => {
  if (status === 401) return false
  if (status === 403) return true
  if (!res || typeof res !== 'object') return false
  const record = res as Record<string, unknown>
  const code = Number(record.code)
  return code === 40300 || code === 40101
}

const isAuthBusinessError = (res: unknown, status: number | null = null) => {
  if (status === 401) return true
  if (status === 403) return false
  if (!res || typeof res !== 'object') return status === 401
  const record = res as Record<string, unknown>
  const code = Number(record.code)
  if (Number.isFinite(code)) return code === 401 || code === 40100

  const message = resolveBusinessMessage(res).toLowerCase()
  if (!message) return false

  return (
    message.includes('未登录') ||
    message.includes('登录失效') ||
    message.includes('认证') ||
    message.includes('token') ||
    message.includes('unauthorized') ||
    message.includes('not login')
  )
}

export const classifyApiError = (error: unknown): ApiErrorKind => {
  if (!isApiRequestError(error)) return error instanceof TypeError ? 'VALIDATION' : 'UNKNOWN'
  if (error.httpStatus === 401) return 'AUTHENTICATION_REQUIRED'
  if (error.httpStatus === 403) return 'PERMISSION_DENIED'
  if (error.code === 40300 || error.code === 40101) return 'PERMISSION_DENIED'
  if (error.code === 401 || error.code === 40100) return 'AUTHENTICATION_REQUIRED'
  if (
    error.code === 50001
    || error.httpStatus === 409
    || error.code === 409
    || error.code === 40900
  ) return 'CONFLICT'
  if (error.httpStatus === 404 || error.code === 404 || error.code === 40400) return 'NOT_FOUND'
  if (error.code === 40000) return 'VALIDATION'
  if (error.httpStatus != null && error.httpStatus >= 500) return 'SERVER'
  if (error.httpStatus != null && error.httpStatus >= 400) return 'VALIDATION'
  if (error.httpStatus == null && error.code == null) return 'NETWORK'
  return 'UNKNOWN'
}

const handleAuthenticationRequired = () => {
  const result = terminateAuthenticatedSession('AUTHENTICATION_REQUIRED')
  if (!result.changed) return

  try {
    const toastStore = useToastStore()
    toastStore.push({ type: 'error', message: '登录已过期，请重新登录。' })
  } catch (error) {
    console.error('弹出登录过期提示失败', error)
  }

  if (router.currentRoute.value.path !== '/login') {
    void router.replace('/login')
  }
}

// 1. 请求拦截器 (Request Interceptor)
request.interceptors.request.use(
  (config) => {
    const token = readAuthToken()
    if (token && !isPublicAuthPath(config.url)) {
      config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// 2. 响应拦截器 (Response Interceptor)
request.interceptors.response.use(
  (response) => {
    const res = response.data
    const requestUrl = response.config?.url
    const traceId = resolveTraceId(response.headers)

    const versionSync = syncBackendCacheVersion(response.headers, res)
    if (versionSync?.changed) {
      console.warn(
        `[cache] backend version changed: ${versionSync.previousVersion} -> ${versionSync.currentVersion}. backend-derived actor caches invalidated.`,
      )
      if (versionSync.shouldReload && !isPublicAuthPath(requestUrl) && typeof window !== 'undefined') {
        window.setTimeout(() => window.location.reload(), 0)
      }
    }

    const htmlAccessError = classifyHtmlAccessError(res, resolveHttpStatus(response.status))
    if (htmlAccessError) {
      if (isPublicAuthPath(requestUrl)) {
        return Promise.reject(
          createApiRequestError(resolvePublicAuthHtmlMessage(htmlAccessError), {
            code: null,
            httpStatus: response.status,
            traceId,
          }),
        )
      }
      if (isLocalAuthFailureRequest(response.config)) {
        return Promise.reject(
          createApiRequestError(
            htmlAccessError === 'PERMISSION_DENIED' ? '请求被网关拒绝。' : '认证请求未通过。',
            { httpStatus: response.status, traceId },
          ),
        )
      }
      if (htmlAccessError === 'PERMISSION_DENIED') {
        return Promise.reject(
          createApiRequestError('没有权限执行此操作', { httpStatus: response.status, traceId }),
        )
      }
      handleAuthenticationRequired()
      return Promise.reject(
        createApiRequestError('登录已失效，请重新登录。', { httpStatus: response.status, traceId }),
      )
    }

    if (!res || typeof res !== 'object' || !('code' in res)) {
      return res
    }

    const record = res as Record<string, unknown>
    const code = resolveBusinessCode(record)
    const message = resolveBusinessMessage(record)

    if (isPermissionBusinessError(record, resolveHttpStatus(response.status))) {
      return Promise.reject(
        createApiRequestError(message || '没有权限执行此操作', {
          code,
          httpStatus: response.status,
          traceId,
        }),
      )
    }

    if (isAuthBusinessError(record, resolveHttpStatus(response.status))) {
      if (isPublicAuthPath(requestUrl)) {
        return Promise.reject(
          createApiRequestError(message || '登录失败，请检查账号密码。', {
            code,
            httpStatus: response.status,
            traceId,
          }),
        )
      }
      if (isLocalAuthFailureRequest(response.config)) {
        return Promise.reject(
          createApiRequestError(message || '认证请求未通过。', { code, httpStatus: response.status, traceId }),
        )
      }
      handleAuthenticationRequired()
      return Promise.reject(
        createApiRequestError(message || '未登录', { code, httpStatus: response.status, traceId }),
      )
    }

    if (code !== 0) {
      const detail = message || `code=${String(record.code ?? 'unknown')}`
      console.error('业务报错：', detail)
      return Promise.reject(
        createApiRequestError(message || '请求失败', { code, httpStatus: response.status, traceId }),
      )
    }

    return record.data
  },
  (error) => {
    if (axios.isAxiosError(error)) {
      const requestUrl = error.config?.url
      const responseData = error.response?.data
      const status = resolveHttpStatus(error.response?.status)
      const code = resolveBusinessCode(responseData)
      const message = resolveBusinessMessage(responseData)
      const traceId = resolveTraceId(error.response?.headers)

      if (isPermissionBusinessError(responseData, status)) {
        return Promise.reject(
          createApiRequestError(message || '没有权限执行此操作', { code, httpStatus: status, traceId }),
        )
      }

      if (isAuthBusinessError(responseData, status)) {
        if (isPublicAuthPath(requestUrl)) {
          return Promise.reject(
            createApiRequestError(message || '登录接口被拒绝，请检查网关或后端鉴权配置。', {
              code,
              httpStatus: status,
              traceId,
            }),
          )
        }
        if (isLocalAuthFailureRequest(error.config)) {
          return Promise.reject(
            createApiRequestError(message || '认证请求未通过。', { code, httpStatus: status, traceId }),
          )
        }
        handleAuthenticationRequired()
        return Promise.reject(
          createApiRequestError(message || '登录已失效，请重新登录。', {
            code,
            httpStatus: status,
            traceId,
          }),
        )
      }

      const htmlAccessError = classifyHtmlAccessError(responseData, status)
      if (htmlAccessError) {
        if (isPublicAuthPath(requestUrl)) {
          return Promise.reject(
            createApiRequestError(resolvePublicAuthHtmlMessage(htmlAccessError), {
              code,
              httpStatus: status,
              traceId,
            }),
          )
        }
        if (isLocalAuthFailureRequest(error.config)) {
          return Promise.reject(
            createApiRequestError(
              htmlAccessError === 'PERMISSION_DENIED' ? '请求被网关拒绝。' : '认证请求未通过。',
              { code, httpStatus: status, traceId },
            ),
          )
        }
        if (htmlAccessError === 'PERMISSION_DENIED') {
          return Promise.reject(
            createApiRequestError('没有权限执行此操作', { code, httpStatus: status, traceId }),
          )
        }
        handleAuthenticationRequired()
        return Promise.reject(
          createApiRequestError('登录已失效，请重新登录。', {
          code,
          httpStatus: status,
          traceId,
          }),
        )
      }

      const normalizedError = createApiRequestError(message || error.message || '网络请求失败', {
        code,
        httpStatus: status,
        traceId,
      })
      console.error('网络请求错误：', normalizedError.message)
      return Promise.reject(normalizedError)
    }

    if (isApiRequestError(error)) return Promise.reject(error)

    const message = error instanceof Error ? error.message : '网络请求失败'
    console.error('网络请求错误：', message)
    return Promise.reject(createApiRequestError(message))
  },
)

export default request
