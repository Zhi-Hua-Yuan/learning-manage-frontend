import request from '../utils/request'

export interface ReviewPayload {
  year?: number
  weekNo?: number
  startDate?: string
  endDate?: string
  completedTaskCount?: number
  focusProjectName?: string
  reflection?: string
}

// 获取当前周总结草稿或已保存记录
export const fetchCurrentReview = () => {
  return request.get('/review/current')
}

// 保存/更新周总结
export const saveReviewApi = (data: ReviewPayload) => {
  return request.post('/review/save', data)
}

export const updateReviewApi = (data: ReviewPayload & { id?: string | number }) =>
  request.post('/review/update', data)

export const deleteReviewApi = (id: string | number) => request.post(`/review/delete/${id}`)

// 根据 ID 获取周总结详情
export const getReviewDetailApi = (id: string | number) => request.get(`/review/${id}`)

// 获取历史周总结列表
export const fetchReviewHistory = () => {
  return request.get('/review/history')
}
