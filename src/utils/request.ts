import axios from 'axios'
import router from '../router' // 引入路由用于跳转
import { useToastStore } from '@/stores/toast'
import { clearAuthToken, readAuthToken } from '@/utils/authToken'
import { syncBackendCacheVersion } from '@/utils/cacheVersion'

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
  if (Number.isFinite(code) && (code === 401 || code === 40100 || code === 403)) return true

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
        return Promise.reject(new Error('登录接口被拒绝（403），请检查网关或后端鉴权配置。'))
      }
      redirectToLogin()
      return Promise.reject(new Error('登录已失效，请重新登录。'))
    }

    if (!res || typeof res !== 'object' || !('code' in res)) {
      return res
    }

    const record = res as Record<string, unknown>
    const code = Number(record.code)
    const message = resolveBusinessMessage(record)

    if (isAuthBusinessError(record)) {
      if (isPublicAuthPath(requestUrl)) {
        return Promise.reject(new Error(message || '登录失败，请检查账号密码。'))
      }
      redirectToLogin()
      return Promise.reject(new Error(message || '未登录'))
    }

    if (code !== 0) {
      const detail = message || `code=${String(record.code ?? 'unknown')}`
      console.error('业务报错：', detail)
      return Promise.reject(new Error(message || '请求失败'))
    }

    return record.data
  },
  (error) => {
    if (axios.isAxiosError(error)) {
      const requestUrl = error.config?.url
      const status = Number(error.response?.status)
      if (status === 401 || status === 403) {
        if (isPublicAuthPath(requestUrl)) {
          return Promise.reject(new Error('登录接口被拒绝（403），请检查网关或后端鉴权配置。'))
        }
        redirectToLogin()
        return Promise.reject(new Error('登录已失效，请重新登录。'))
      }

      if (isHtmlForbiddenPage(error.response?.data)) {
        if (isPublicAuthPath(requestUrl)) {
          return Promise.reject(new Error('登录接口被拒绝（403），请检查网关或后端鉴权配置。'))
        }
        redirectToLogin()
        return Promise.reject(new Error('登录已失效，请重新登录。'))
      }
    }

    console.error('网络请求错误：', error.message)
    return Promise.reject(error)
  },
)

export default request
