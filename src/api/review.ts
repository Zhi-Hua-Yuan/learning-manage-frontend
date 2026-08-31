import request from '../utils/request'
import type { EntityId, WirePage } from '@/types/common'
import type { SharedWeeklyReviewWire } from '@/types/review'
import { omitUndefined, requireEntityId } from './guards'

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

export interface TeamSharedReviewParams {
  teamId: EntityId
  current?: number
  size?: number
}

export const fetchTeamSharedReviewsApi = (params: TeamSharedReviewParams) => {
  const teamId = requireEntityId(params.teamId, 'teamId')
  const query = omitUndefined({ teamId, current: params.current, size: params.size })
  return request.get<unknown, Promise<WirePage<SharedWeeklyReviewWire>>>('/review/team', { params: query })
}
