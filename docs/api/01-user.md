# 用户接口 (User API)

## 概述

- **Base URL**: `http://localhost:8123/api`
- **认证**: 除登录/注册外均需携带 `Authorization: Bearer <token>`

## 响应格式

所有接口统一返回 `BaseResponse<T>`:

```json
{
  "code": 0,
  "message": "OK",
  "data": { ... }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 0=成功，非0=失败 |
| message | string | 状态信息 |
| data | object | 响应数据，失败时为 null |

---

## 数据模型

### UserRegisterRequest

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| account | string | 是 | 账户名（唯一） |
| username | string | 是 | 显示名称 |
| password | string | 是 | 密码 |
| confirmPassword | string | 是 | 确认密码（需与 password 一致） |

### UserLoginRequest

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| account | string | 是 | 账户名 |
| password | string | 是 | 密码 |

### UserUpdateRequest

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 新的显示名称 |

### UserUpdatePasswordRequest

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| oldPassword | string | 是 | 当前密码 |
| newPassword | string | 是 | 新密码 |

### UserVO（/user/me 响应）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | long | 用户 ID |
| account | string | 账户名 |
| username | string | 显示名称 |
| userRole | string | 角色，如 "user" |
| createTime | datetime | 注册时间 |

### UserLoginVo（/user/login 响应）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | long | 用户 ID |
| username | string | 显示名称 |
| token | string | JWT 令牌，后续请求携带 |

---

## 接口详情

### POST /user/register — 注册

**请求体:**
```json
{
  "account": "alice_dev",
  "username": "Alice Chen",
  "password": "Str0ng!Pass",
  "confirmPassword": "Str0ng!Pass"
}
```

**成功响应:**
```json
{
  "code": 0,
  "message": "OK",
  "data": 1879200000000001
}
```
返回值为新用户 ID。

**错误响应:**

| code | 说明 |
|------|------|
| 20002 | 账号已存在 |
| 40000 | 参数错误（密码不匹配等） |

---

### POST /user/login — 登录

**请求体:**
```json
{
  "account": "alice_dev",
  "password": "Str0ng!Pass"
}
```

**成功响应:**
```json
{
  "code": 0,
  "message": "OK",
  "data": {
    "id": 1879200000000001,
    "username": "Alice Chen",
    "token": "<issued-jwt>"
  }
}
```
保存 token，后续请求在 header 中携带 `Authorization: Bearer <token>`。

**错误响应:**

| code | 说明 |
|------|------|
| 20001 | 用户不存在 |
| 20003 | 密码错误 |

---

### POST /user/logout — 登出

**请求体:** 无

**成功响应:**
```json
{
  "code": 0,
  "message": "OK",
  "data": true
}
```
前端清除本地 token 即可。

---

### GET /user/me — 获取当前用户信息

**请求头:** `Authorization: Bearer <token>`

**成功响应:**
```json
{
  "code": 0,
  "message": "OK",
  "data": {
    "id": 1879200000000001,
    "account": "alice_dev",
    "username": "Alice Chen",
    "userRole": "user",
    "createTime": "2026-03-15 10:30:00"
  }
}
```

---

### POST /user/update — 更新用户名

**请求头:** `Authorization: Bearer <token>`

**请求体:**
```json
{
  "username": "Alice Chen (Work)"
}
```

**成功响应:**
```json
{
  "code": 0,
  "message": "OK",
  "data": true
}
```

---

### POST /user/password/update — 修改密码

**请求头:** `Authorization: Bearer <token>`

**请求体:**
```json
{
  "oldPassword": "Str0ng!Pass",
  "newPassword": "N3wStr0ng!Pass"
}
```

**成功响应:**
```json
{
  "code": 0,
  "message": "OK",
  "data": true
}
```

**错误响应:**

| code | 说明 |
|------|------|
| 20003 | 旧密码错误 |

---

## 错误码

| code | 说明 |
|------|------|
| 0 | 成功 |
| 40000 | 请求参数错误 |
| 40100 | 未登录 |
| 20001 | 用户不存在 |
| 20002 | 账号已存在 |
| 20003 | 密码错误 |
