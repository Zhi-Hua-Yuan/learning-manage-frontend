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

export interface AiListReplanPreviewRequest {
  listId: string | number
}

export interface AiListReplanPreviewItem {
  taskId: string | number
  oldTitle?: string
  newTitle?: string
  oldPriority?: number
  newPriority?: number
  oldDueDate?: string | null
  newDueDate?: string | null
  confidence?: number
  reason?: string
}

export interface AiListReplanPreviewResponse {
  operationId: string
  changedCount?: number
  previewTasks?: AiListReplanPreviewItem[]
}

export interface AiListReplanConfirmRequest {
  listId: string | number
  operationId: string
}

export interface AiListReplanCancelRequest {
  operationId: string
}

// AI 清单任务智能重排预览（不落库）
export const aiListReplanPreviewApi = (
  data: AiListReplanPreviewRequest,
): Promise<AiListReplanPreviewResponse> => {
  return request.post('/ai/list/replan/preview', data) as Promise<AiListReplanPreviewResponse>
}

// AI 清单任务智能重排确认（落库）
export const aiListReplanConfirmApi = (data: AiListReplanConfirmRequest): Promise<boolean> => {
  return request.post('/ai/list/replan/confirm', data) as Promise<boolean>
}

// AI 清单任务智能重排取消（不落库）
export const aiListReplanCancelApi = (data: AiListReplanCancelRequest): Promise<boolean> => {
  return request.post('/ai/list/replan/cancel', data) as Promise<boolean>
}
