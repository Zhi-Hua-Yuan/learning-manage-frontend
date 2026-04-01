import request from '../utils/request'

// 1. 登录
export const loginApi = (data: any) => request.post('/user/login', data)

// 2. 注册
export const registerApi = (data: any) => request.post('/user/register', data)

// 3. 退出登录
export const logoutApi = () => request.post('/user/logout')

// 4. 获取当前登录用户信息
export const getUserMeApi = () => request.get('/user/me')

// 5. 修改个人信息
export const updateUserInfoApi = (data: { username: string }) => request.post('/user/update', data)

// 6. 修改密码
export const updatePasswordApi = (data: any) => request.post('/user/password/update', data)
