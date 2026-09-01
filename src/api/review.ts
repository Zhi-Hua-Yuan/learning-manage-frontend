import request from '../utils/request'
import type { EntityId, WirePage } from '@/types/common'
import type {
  SharedWeeklyReviewWire,
  WeeklyReviewDetailWire,
  WeeklyReviewSavePayload,
  WeeklyReviewUpdatePayload,
} from '@/types/review'
import { omitUndefined, requireEntityId } from './guards'

export interface LegacyPrivateReviewPayload {
  year?: number
  weekNo?: number
  reflection?: string
}

export interface LegacyPrivateReviewUpdatePayload {
  id: EntityId
  reflection?: string
}

const toWeeklyReviewSaveBody = (
  data: WeeklyReviewSavePayload,
): WeeklyReviewSavePayload => ({
  year: data.year,
  weekNo: data.weekNo,
  visibilityScope: data.visibilityScope,
  teamId: data.teamId,
  focusProjectId: data.focusProjectId,
  reflection: data.reflection,
  nextPlan: data.nextPlan,
  sharedSummary: data.sharedSummary,
  taskIds: data.taskIds,
})

const toWeeklyReviewUpdateBody = (
  data: WeeklyReviewUpdatePayload,
): WeeklyReviewUpdatePayload => ({
  id: data.id,
  visibilityScope: data.visibilityScope,
  teamId: data.teamId,
  focusProjectId: data.focusProjectId,
  reflection: data.reflection,
  nextPlan: data.nextPlan,
  sharedSummary: data.sharedSummary,
  taskIds: data.taskIds,
})

// 获取当前周总结草稿或已保存记录
export const fetchCurrentReview = () => {
  return request.get<unknown, Promise<WeeklyReviewDetailWire>>('/review/current')
}

export const saveWeeklyReviewApi = (data: WeeklyReviewSavePayload) => {
  return request.post<unknown, Promise<unknown>, WeeklyReviewSavePayload>(
    '/review/save',
    toWeeklyReviewSaveBody(data),
  )
}

export const updateWeeklyReviewApi = (data: WeeklyReviewUpdatePayload) => {
  return request.post<unknown, Promise<unknown>, WeeklyReviewUpdatePayload>(
    '/review/update',
    toWeeklyReviewUpdateBody(data),
  )
}

/** @deprecated Migrate the stage-0 PRIVATE editor to saveWeeklyReviewApi in WP7-D. */
export const saveReviewApi = (data: LegacyPrivateReviewPayload) => {
  const body = omitUndefined({
    year: data.year,
    weekNo: data.weekNo,
    reflection: data.reflection,
  })
  return request.post('/review/save', body)
}

/** @deprecated Migrate the stage-0 PRIVATE editor to updateWeeklyReviewApi in WP7-D. */
export const updateReviewApi = (data: LegacyPrivateReviewUpdatePayload) => {
  const body = omitUndefined({
    id: requireEntityId(data.id, 'id'),
    reflection: data.reflection,
  })
  return request.post('/review/update', body)
}

export const deleteReviewApi = (id: string | number) => request.post(`/review/delete/${id}`)

// 根据 ID 获取周总结详情
export const getReviewDetailApi = (rawId: EntityId) => {
  const id = requireEntityId(rawId, 'id')
  return request.get<unknown, Promise<WeeklyReviewDetailWire>>(`/review/${id}`)
}

// 获取历史周总结列表
export const fetchReviewHistory = () => {
  return request.get<unknown, Promise<WeeklyReviewDetailWire[]>>('/review/history')
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
