import request from '../utils/request'

// 登录接口 (对应你后端的 POST /user/login)
export const loginApi = (data: any) => {
  return request.post('/user/login', data)
}

// 注册接口 (对应你后端的 POST /user/register)
export const registerApi = (data: any) => {
  return request.post('/user/register', data)
}
