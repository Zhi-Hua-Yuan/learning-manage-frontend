import axios from 'axios'
import router from '../router' // 引入路由用于跳转

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 1. 请求拦截器 (Request Interceptor)
request.interceptors.request.use(
  (config) => {
    // 👇👇👇 新增：从浏览器的本地存储中获取 token
    const token = localStorage.getItem('token')
    if (token) {
      // 你的后端拦截器写的是 request.getHeader("Authorization")
      // 所以这里直接把 token 塞进 Authorization 头里
      config.headers.Authorization = token
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
      alert('登录已过期，请重新登录！')
      localStorage.removeItem('token') // 清除失效的 token
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
