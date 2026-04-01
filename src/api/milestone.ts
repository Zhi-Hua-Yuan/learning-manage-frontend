import request from '../utils/request'

// 获取里程碑列表 (对应 GET /milestone/list)
export const fetchMilestoneList = (params: { projectId: string }) => {
  return request.get('/milestone/list', { params })
}

// 新增里程碑 (对应 POST /milestone/add)
export const addMilestoneApi = (data: { name: string; projectId: string; orderNo?: number }) => {
  return request.post('/milestone/add', data)
}

// 更新里程碑 (对应 POST /milestone/update)
export const updateMilestoneApi = (data: any) => {
  return request.post('/milestone/update', data)
}

// 删除里程碑 (对应 POST /milestone/delete/{id})
export const deleteMilestoneApi = (id: string) => {
  return request.post(`/milestone/delete/${id}`)
}
