import request from '../utils/request'

type EntityId = string | number

export interface MilestoneListParams {
  projectId: EntityId
  keyword?: string
}

export interface AddMilestonePayload {
  name: string
  projectId: EntityId
  orderNo?: number
}

export interface UpdateMilestonePayload {
  id: EntityId
  name?: string
  projectId?: EntityId
  orderNo?: number
  progress?: number
}

// 获取里程碑列表 (对应 GET /milestone/list)
export const fetchMilestoneList = (params: MilestoneListParams) => {
  return request.get('/milestone/list', { params })
}

// 新增里程碑 (对应 POST /milestone/add)
export const addMilestoneApi = (data: AddMilestonePayload) => {
  return request.post('/milestone/add', data)
}

// 更新里程碑 (对应 POST /milestone/update)
export const updateMilestoneApi = (data: UpdateMilestonePayload) => {
  return request.post('/milestone/update', data)
}

// 删除里程碑 (对应 POST /milestone/delete/{id})
export const deleteMilestoneApi = (id: EntityId) => {
  return request.post(`/milestone/delete/${id}`)
}
