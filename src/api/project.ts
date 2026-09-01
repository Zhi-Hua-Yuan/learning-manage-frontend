import request from '../utils/request'
import type { EntityId } from '@/types/common'
import type { ProjectWire } from '@/types/project'
import type { WirePage } from '@/types/common'
import { omitUndefined, requireEntityId } from './guards'

export type ProjectListParams = Record<string, string | number | boolean | undefined>

export interface AddProjectPayload {
  name: string
  goal?: string
  icon?: string
  color?: string
  startDate?: string
  endDate?: string
}

export interface UpdateProjectPayload {
  id: EntityId
  name?: string
  goal?: string
  icon?: string
  color?: string
  status?: number
  startDate?: string
  endDate?: string
}

export interface ReorderProjectItem {
  id: EntityId
  orderNo: number
}

export const fetchProjectList = (params?: ProjectListParams): Promise<WirePage<ProjectWire>> => {
  return request.get<unknown, Promise<WirePage<ProjectWire>>>('/project/list', { params }) as unknown as Promise<WirePage<ProjectWire>>
}

export const addProjectApi = (data: AddProjectPayload) => {
  return request.post('/project/add', data)
}

export const updateProjectApi = (data: UpdateProjectPayload) => {
  return request.post('/project/update', data)
}

export const reorderProjectApi = (data: ReorderProjectItem[]) => {
  return request.post('/project/reorder', data)
}

export const deleteProjectApi = (id: EntityId) => {
  return request.post(`/project/delete/${id}`)
}

export const archiveProjectApi = (ids: EntityId[]) => {
  return request.post('/project/archive', ids)
}

export const fetchArchivedProjectsApi = () => {
  return request.get('/project/list', { params: { status: 1 } })
}

export const recoverProjectApi = (id: EntityId) => {
  return request.post(`/project/recover/${id}`)
}

export interface TeamProjectListParams {
  teamId: EntityId
  pageNum?: number
  pageSize?: number
  status?: number
  keyword?: string
}

export const fetchTeamProjectsApi = (params: TeamProjectListParams) => {
  const teamId = requireEntityId(params.teamId, 'teamId')
  const query = omitUndefined({
    teamId,
    pageNum: params.pageNum,
    pageSize: params.pageSize,
    status: params.status,
    keyword: params.keyword,
  })
  return request.get<unknown, Promise<WirePage<ProjectWire>>>('/project/team/list', { params: query })
}
