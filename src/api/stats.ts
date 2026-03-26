import request from '../utils/request'

// 获取仪表盘总览数据 (对应后端的 GET /stats/overview)
export const fetchStatsOverview = () => {
  return request.get('/stats/overview')
}
