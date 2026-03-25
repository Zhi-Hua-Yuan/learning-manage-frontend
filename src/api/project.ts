import request from '../utils/request'

export const fetchProjectList = (params?: any) => {
  return request.get('/project/list', { params })
}

// 👇👇👇 新增：创建清单接口 👇👇👇
export const addProjectApi = (data: { name: string; icon?: string }) => {
  return request.post('/project/add', data)
}

// 删除清单接口
export const deleteProjectApi = (id: string) => {
  return request.post(`/project/delete/${id}`)
}
