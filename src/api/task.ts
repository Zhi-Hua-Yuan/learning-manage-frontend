import request from '../utils/request'

// 获取任务列表 (对应你后端的 GET /task/list)
export const fetchTaskList = (params: {
  projectId?: string | number
  status?: number
  current?: number
  size?: number
}) => {
  return request.get('/task/list', { params })
}

// 新增任务 (对应你后端的 POST /task/add)
export const addTaskApi = (data: any) => {
  return request.post('/task/add', data)
}

// 更新任务 (对应你后端的 POST /task/update)
export const updateTaskApi = (data: any) => {
  return request.post('/task/update', data)
}

// 删除任务 (对应你后端的 POST /task/delete)
export const deleteTaskApi = (id: string) => {
  return request.post(`/task/delete/${id}`)
}
