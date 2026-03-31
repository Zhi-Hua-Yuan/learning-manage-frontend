import request from '../utils/request'

// 获取当前周总结草稿或已保存记录
export const fetchCurrentReview = () => {
  return request.get('/review/current')
}

// 保存/更新周总结
export const saveReviewApi = (data: any) => {
  return request.post('/review/save', data)
}

// 获取历史周总结列表
export const fetchReviewHistory = () => {
  return request.get('/review/history')
}
