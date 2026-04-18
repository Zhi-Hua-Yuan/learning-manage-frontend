# LearningManage API 文档

> 本文档为前端专用接口文档，涵盖所有业务相关接口。

## 概述

- **Base URL**: `http://localhost:8123/api`
- **响应格式**: 所有接口统一返回 `BaseResponse` 包装对象

### 响应结构

| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码，0=成功，非0=失败 |
| message | string | 状态信息 |
| data | object | 响应数据，失败时为 null |

### 认证说明

除 `/user/login` 和 `/user/register` 外，所有接口需要登录态。
登录成功后从响应 `data.token` 字段获取 token，后续请求携带 header：
```
Authorization: Bearer <token>
```

---

## 目录

1. [用户接口 (User)](#1-用户接口-user) — 注册、登录、用户信息
2. [项目/里程碑/任务接口 (Project/Milestone/Task)](#2-项目里程碑任务接口-projectmilestonetask) — 核心业务 CRUD
3. [周回顾/统计/AI接口 (Review/Stats/AI)](#3-周回顾统计ai接口-reviewstatsai) — 周总结、数据概览、AI 辅助

---

## 1. 用户接口 (User)

详细内容见 [01-user.md](01-user.md)

### 端点概览

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /user/register | 注册 | 否 |
| POST | /user/login | 登录 | 否 |
| POST | /user/logout | 登出 | 是 |
| GET | /user/me | 获取当前用户信息 | 是 |
| POST | /user/update | 更新用户名 | 是 |
| POST | /user/password/update | 修改密码 | 是 |

---

## 2. 项目/里程碑/任务接口 (Project/Milestone/Task)

详细内容见 [02-project-milestone-task.md](02-project-milestone-task.md)

### 端点概览

**Project:**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /project/add | 创建项目 |
| GET | /project/get/{id} | 获取项目详情 |
| GET | /project/list | 获取项目列表（分页） |
| POST | /project/update | 更新项目 |
| POST | /project/reorder | 批量排序 |
| POST | /project/archive | 归档项目 |
| POST | /project/delete/{id} | 删除项目（软删除） |
| POST | /project/recover/{id} | 恢复已删除项目 |

**Milestone:**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /milestone/add | 创建里程碑 |
| GET | /milestone/list | 获取里程碑列表 |
| POST | /milestone/update | 更新里程碑 |
| POST | /milestone/delete/{id} | 删除里程碑 |

**Task:**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /task/add | 创建任务 |
| GET | /task/get/{id} | 获取任务详情 |
| GET | /task/list | 获取任务列表（分页+筛选） |
| POST | /task/update | 更新任务 |
| POST | /task/delete/{id} | 删除任务（软删除） |
| POST | /task/batch-rename | 批量应用AI改名建议 |
| POST | /task/batch-rename/rollback | 回滚批量改名 |

### 实体关系

```
Project (1) ──────< (many) Milestone
  │
  └─────< (many) Task  <─────┘
```

### 状态值说明

**Project.status:**

| 值 | 含义 |
|----|------|
| 0 | 进行中（Active） |
| 1 | 已归档（Archived） |

**Task.status:**

| 值 | 含义 |
|----|------|
| 0 | 未完成（TODO） |
| 1 | 一般完成（DONE_BASIC） |
| 2 | 正常完成（DONE_STANDARD） |
| 3 | 超额完成（DONE_EXCELLENT） |

### deleteSource 字段说明

标识软删除的触发来源：

| 值 | 含义 |
|----|------|
| 0 | 无（正常状态或手动删除） |
| 1 | 手动删除（用户主动删除） |
| 2 | 级联删除（父级删除时自动触发） |

---

## 3. 周回顾/统计/AI接口 (Review/Stats/AI)

详细内容见 [03-review-stats-ai.md](03-review-stats-ai.md)

### 端点概览

**WeeklyReview:**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /review/current | 获取当前周草稿 |
| POST | /review/save | 保存/更新周总结 |
| GET | /review/{id} | 获取周总结详情 |
| POST | /review/update | 部分更新周总结 |
| POST | /review/delete/{id} | 删除周总结 |
| GET | /review/history | 获取历史周总结列表 |

**Stats:**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /stats/overview | 获取仪表盘概览数据 |

**AI:**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /ai/breakdown | AI 任务拆解（目标 → 里程碑 → 任务） |
| POST | /ai/today-order/recommend | AI 今日任务推荐顺序 |
| POST | /ai/daily-review/suggest-rename | AI 日报回顾任务改名建议 |
| POST | /ai/polish | AI 周总结润色 |

---

## 错误码

| 错误码 | 说明 |
|--------|------|
| PARAMS_ERROR | 请求参数为空或格式错误 |
| NOT_LOGIN_ERROR | 用户未登录 |
| NO_AUTH_ERROR | 无权限 |
| OPERATION_ERROR | 业务操作失败 |
| 40100 | 账户或密码为空 / 未认证 |
| 40101 | 账户不存在或已存在 |
| 40102 | 密码不正确或密码不匹配 |

---

## 字段含义速查

以下字段命名较随意，含义如下：

| 字段 | 实体 | 真实含义 |
|------|------|----------|
| orderNo | Project/Milestone | 排序序号，数值越小排序越靠前 |
| deleteSource | Milestone/Task | 删除来源：0=无, 1=手动, 2=级联 |
| completedTaskCount | WeeklyReview | 本周完成任务数快照（提交时自动统计） |
| focusProjectName | WeeklyReview | 本周重点项目名称快照 |
| isDelete | 所有实体 | 软删除标记：0=正常, 1=已删除 |
| deletedAt | Project/Milestone/Task | 软删除时间戳 |
