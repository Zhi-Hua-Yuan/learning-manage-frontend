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

export interface AiTodayOrderRecommendRequest {
  taskIds?: Array<string | number>
  timezone?: string
  now?: string
  strategy?: 'balanced' | 'benefit_first' | 'quick_win'
  limit?: number
}

export interface AiTodayOrderItem {
  taskId: string | number
  rank?: number
  score?: number
  difficulty?: number
  cost?: number
  benefit?: number
  estimatedMinutes?: number
  reason?: string
}

export interface AiTodayOrderRecommendResponse {
  strategy?: 'balanced' | 'benefit_first' | 'quick_win'
  generatedAt?: string
  fallbackUsed?: boolean
  items?: AiTodayOrderItem[]
}

// AI 今日任务推荐顺序
export const aiTodayOrderRecommendApi = (data: AiTodayOrderRecommendRequest) => {
  return request.post('/ai/today-order/recommend', data)
}
