import axios from 'axios'
import router from '../router' // 引入路由用于跳转
import { useToastStore } from '@/stores/toast'
import { clearAuthToken, readAuthToken } from '@/utils/authToken'
import { syncBackendCacheVersion } from '@/utils/cacheVersion'

interface ApiRequestErrorOptions {
  code?: number | null
  httpStatus?: number | null
}

export class ApiRequestError extends Error {
  readonly code: number | null
  readonly httpStatus: number | null

  constructor(message: string, options: ApiRequestErrorOptions = {}) {
    super(message)
    this.name = 'ApiRequestError'
    this.code = options.code ?? null
    this.httpStatus = options.httpStatus ?? null
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

const isPublicAuthPath = (url: unknown) => {
  if (typeof url !== 'string' || !url) return false
  const normalized = url.toLowerCase()
  return normalized.includes('/user/login') || normalized.includes('/user/register')
}

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

const createApiRequestError = (
  message: string,
  options: ApiRequestErrorOptions = {},
): ApiRequestError => {
  return new ApiRequestError(message, options)
}

const isHtmlForbiddenPage = (value: unknown) => {
  if (typeof value !== 'string') return false
  const normalized = value.toLowerCase()
  if (!normalized.includes('<html')) return false
  return (
    normalized.includes('403 forbidden') ||
    normalized.includes('401 unauthorized') ||
    normalized.includes('access denied') ||
    normalized.includes('nginx')
  )
}

const isAuthBusinessError = (res: unknown) => {
  if (!res || typeof res !== 'object') return false
  const record = res as Record<string, unknown>
  const code = Number(record.code)
  if (Number.isFinite(code) && (code === 401 || code === 40100)) return true

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
  if (error.code === 40300 || error.code === 40101 || error.httpStatus === 403) return 'PERMISSION_DENIED'
  if (error.httpStatus === 401 || error.code === 401 || error.code === 40100) return 'AUTHENTICATION_REQUIRED'
  if (error.httpStatus === 409 || error.code === 409 || error.code === 40900) return 'CONFLICT'
  if (error.httpStatus === 404 || error.code === 404 || error.code === 40400) return 'NOT_FOUND'
  if (error.httpStatus != null && error.httpStatus >= 500) return 'SERVER'
  if (error.httpStatus != null && error.httpStatus >= 400) return 'VALIDATION'
  return 'UNKNOWN'
}

const redirectToLogin = () => {
  clearAuthToken()

  try {
    const toastStore = useToastStore()
    toastStore.push({ type: 'error', message: '登录已过期，请重新登录。' })
  } catch (error) {
    console.error('弹出登录过期提示失败', error)
  }

  if (router.currentRoute.value.path !== '/login') {
    void router.push('/login')
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

    const versionSync = syncBackendCacheVersion(response.headers, res)
    if (versionSync?.changed) {
      console.warn(
        `[cache] backend version changed: ${versionSync.previousVersion} -> ${versionSync.currentVersion}. local cache cleared.`,
      )
      if (versionSync.shouldReload && !isPublicAuthPath(requestUrl) && typeof window !== 'undefined') {
        window.setTimeout(() => window.location.reload(), 0)
      }
    }

    if (isHtmlForbiddenPage(res)) {
      if (isPublicAuthPath(requestUrl)) {
        return Promise.reject(
          createApiRequestError('登录接口被拒绝（403），请检查网关或后端鉴权配置。', {
            httpStatus: response.status,
          }),
        )
      }
      redirectToLogin()
      return Promise.reject(
        createApiRequestError('登录已失效，请重新登录。', { httpStatus: response.status }),
      )
    }

    if (!res || typeof res !== 'object' || !('code' in res)) {
      return res
    }

    const record = res as Record<string, unknown>
    const code = resolveBusinessCode(record)
    const message = resolveBusinessMessage(record)

    if (isAuthBusinessError(record)) {
      if (isPublicAuthPath(requestUrl)) {
        return Promise.reject(
          createApiRequestError(message || '登录失败，请检查账号密码。', {
            code,
            httpStatus: response.status,
          }),
        )
      }
      redirectToLogin()
      return Promise.reject(
        createApiRequestError(message || '未登录', { code, httpStatus: response.status }),
      )
    }

    if (code !== 0) {
      const detail = message || `code=${String(record.code ?? 'unknown')}`
      console.error('业务报错：', detail)
      return Promise.reject(
        createApiRequestError(message || '请求失败', { code, httpStatus: response.status }),
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

      if (code === 40300 || code === 40101) {
        return Promise.reject(
          createApiRequestError(message || '没有权限执行此操作', { code, httpStatus: status }),
        )
      }

      if (status === 401 || status === 403 || isAuthBusinessError(responseData)) {
        if (isPublicAuthPath(requestUrl)) {
          return Promise.reject(
            createApiRequestError(message || '登录接口被拒绝，请检查网关或后端鉴权配置。', {
              code,
              httpStatus: status,
            }),
          )
        }
        redirectToLogin()
        return Promise.reject(
          createApiRequestError(message || '登录已失效，请重新登录。', {
            code,
            httpStatus: status,
          }),
        )
      }

      if (isHtmlForbiddenPage(responseData)) {
        if (isPublicAuthPath(requestUrl)) {
          return Promise.reject(
            createApiRequestError('登录接口被拒绝（403），请检查网关或后端鉴权配置。', {
              code,
              httpStatus: status,
            }),
          )
        }
        redirectToLogin()
        return Promise.reject(
          createApiRequestError('登录已失效，请重新登录。', {
            code,
            httpStatus: status,
          }),
        )
      }

      const normalizedError = createApiRequestError(message || error.message || '网络请求失败', {
        code,
        httpStatus: status,
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
