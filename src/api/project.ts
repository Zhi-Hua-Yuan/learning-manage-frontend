import request from '../utils/request'

export const fetchProjectList = (params?: any) => {
  return request.get('/project/list', { params })
}

export const addProjectApi = (data: { name: string; icon?: string }) => {
  return request.post('/project/add', data)
}

export const updateProjectApi = (data: { id: string; name: string; icon?: string }) => {
  return request.post('/project/update', data)
}

export const reorderProjectApi = (data: Array<{ id: string; orderNo: number }>) => {
  return request.post('/project/reorder', data)
}

export const deleteProjectApi = (id: string) => {
  return request.post(`/project/delete/${id}`)
}
