import request from '../utils/request'

type EntityId = string | number

export type ProjectListParams = Record<string, string | number | boolean | undefined>

export interface AddProjectPayload {
  name: string
  icon?: string
}

export interface UpdateProjectPayload {
  id: EntityId
  name: string
  icon?: string
}

export interface ReorderProjectItem {
  id: EntityId
  orderNo: number
}

export const fetchProjectList = (params?: ProjectListParams) => {
  return request.get('/project/list', { params })
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
