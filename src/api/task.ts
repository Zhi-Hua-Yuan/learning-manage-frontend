import request from '../utils/request'

type EntityId = string | number

export interface TaskListParams {
  projectId?: EntityId
  status?: number
  isOverdue?: boolean
  current?: number
  size?: number
}

export interface AddTaskPayload {
  title: string
  projectId: EntityId
  description?: string
  status?: number
  priority?: number
  dueDate?: string | null
  milestoneId?: EntityId | null
}

export interface UpdateTaskPayload {
  id: EntityId
  title?: string
  projectId?: EntityId
  description?: string
  status?: number
  priority?: number
  dueDate?: string | null
  milestoneId?: EntityId | null
}

// 获取任务列表 (对应你后端的 GET /task/list)
export const fetchTaskList = (params: TaskListParams) => {
  return request.get('/task/list', { params })
}

// 新增任务 (对应你后端的 POST /task/add)
export const addTaskApi = (data: AddTaskPayload) => {
  return request.post('/task/add', data)
}

// 更新任务 (对应你后端的 POST /task/update)
export const updateTaskApi = (data: UpdateTaskPayload) => {
  return request.post('/task/update', data)
}

// 删除任务 (对应你后端的 POST /task/delete)
export const deleteTaskApi = (id: EntityId) => {
  return request.post(`/task/delete/${id}`)
}
