import axios from 'axios'
import router from '../router' // 引入路由用于跳转
import { useToastStore } from '@/stores/toast'
import { clearAuthToken, readAuthToken } from '@/utils/authToken'

const request = axios.create({
  baseURL: '/api',
  timeout: 300000,
})

// 1. 请求拦截器 (Request Interceptor)
request.interceptors.request.use(
  (config) => {
    const token = readAuthToken()
    if (token) {
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

    // 👇👇👇 新增：处理后端的未登录状态码
    // 假设你的 ErrorCode.NOT_LOGIN_ERROR 的 code 是 40100 (请根据你后端实际的错误码调整)
    if (res.code === 40100 || res.message?.includes('未登录')) {
      try {
        const toastStore = useToastStore()
        toastStore.push({ type: 'error', message: '登录已过期，请重新登录。' })
      } catch (error) {
        console.error('弹出登录过期提示失败', error)
      }
      clearAuthToken() // 清除失效的 token
      router.push('/login') // 强制跳回登录页
      return Promise.reject(new Error(res.message || '未登录'))
    }

    if (res.code !== 0) {
      console.error('业务报错：', res.message)
      return Promise.reject(new Error(res.message || 'Error'))
    } else {
      return res.data
    }
  },
  (error) => {
    console.error('网络请求错误：', error.message)
    return Promise.reject(error)
  },
)

export default request
