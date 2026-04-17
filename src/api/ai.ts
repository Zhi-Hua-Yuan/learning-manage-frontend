import request from '../utils/request'

// AI 任务拆解
export const aiBreakdownApi = (data: {
  target: string
  description?: string
  duration: string
  detailed?: boolean
}) => {
  return request.post('/ai/breakdown', data)
}

// AI 周总结润色
export const aiPolishApi = (data: {
  taskIds?: string[]
  reflection?: string
}) => {
  return request.post('/ai/polish', data)
}
