# 项目 / 里程碑 / 任务接口 (Project / Milestone / Task API)

## 概述

- **Base URL**: `http://localhost:8123/api`
- **认证**: 所有接口均需携带 `Authorization: Bearer <token>`

## 实体字段说明

### Project（项目）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 ID |
| userId | Long | 所属用户 ID |
| name | String | 项目名称（最大100字符） |
| goal | String | 项目目标（最大500字符） |
| status | Integer | 0=进行中，1=已归档 |
| icon | String | 项目图标（emoji 或图标名称） |
| color | String | 项目颜色（十六进制，如 #4A90D9） |
| progress | BigDecimal | 完成进度百分比（0.00~100.00），实体有但 ProjectVo 不返回 |
| orderNo | Integer | 排序序号（数值越小排序越靠前） |
| startDate | LocalDate | 开始日期 |
| endDate | LocalDate | 结束日期 |
| isDelete | Integer | 软删除标记：0=正常，1=已删除 |
| deletedAt | LocalDateTime | 软删除时间 |
| createTime | LocalDateTime | 创建时间 |
| updateTime | LocalDateTime | 更新时间 |

### Milestone（里程碑）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 ID |
| projectId | Long | 所属项目 ID |
| userId | Long | 所属用户 ID |
| name | String | 里程碑名称（最大100字符） |
| orderNo | Integer | 排序序号（数值越小排序越靠前） |
| progress | BigDecimal | 完成进度百分比（0.00~100.00） |
| deleteSource | Integer | 删除来源：0=无，1=手动删除，2=级联删除 |
| isDelete | Integer | 软删除标记：0=正常，1=已删除 |
| deletedAt | LocalDateTime | 软删除时间 |
| createTime | LocalDateTime | 创建时间 |
| updateTime | LocalDateTime | 更新时间 |

### Task（任务）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 ID |
| projectId | Long | 所属项目 ID |
| milestoneId | Long | 所属里程碑 ID（可为空，表示未归组） |
| userId | Long | 所属用户 ID |
| title | String | 任务标题（最大60字符） |
| description | String | 任务描述（最大550字符） |
| status | Integer | 0=未完成，1=一般完成，2=正常完成，3=超额完成 |
| priority | Integer | 优先级（数值越大优先级越高，默认0） |
| dueDate | LocalDate | 截止日期 |
| completedAt | LocalDateTime | 完成时间（status >= 1 时自动记录） |
| deleteSource | Integer | 删除来源：0=无，1=手动删除，2=级联删除 |
| isDelete | Integer | 软删除标记：0=正常，1=已删除 |
| deletedAt | LocalDateTime | 软删除时间 |
| createTime | LocalDateTime | 创建时间 |
| updateTime | LocalDateTime | 更新时间 |

---

## 状态值说明

### Project.status

| 值 | 含义 |
|----|------|
| 0 | 进行中（Active） |
| 1 | 已归档（Archived） |

### Task.status

| 值 | 含义 |
|----|------|
| 0 | 未完成（TODO） |
| 1 | 一般完成（DONE_BASIC） |
| 2 | 正常完成（DONE_STANDARD） |
| 3 | 超额完成（DONE_EXCELLENT） |

**说明**：status >= 1 均视为"已完成"，用于统计完成数。

### deleteSource（删除来源）

| 值 | 含义 |
|----|------|
| 0 | 无（正常状态或手动删除） |
| 1 | 手动删除（用户主动删除） |
| 2 | 级联删除（父级删除时自动触发） |

---

## 接口详情

### ProjectController

#### POST /project/add — 创建项目

**请求体（ProjectCreateRequest）:**

```json
{
  "name": "英语六级冲刺",
  "goal": "三个月内通过英语六级考试",
  "icon": "📚",
  "color": "#4A90D9",
  "startDate": "2026-04-01",
  "endDate": "2026-06-30"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | String | 是 | 项目名称 |
| goal | String | 否 | 项目目标 |
| icon | String | 否 | 项目图标 |
| color | String | 否 | 项目颜色（十六进制） |
| startDate | LocalDate | 否 | 开始日期，格式 yyyy-MM-dd |
| endDate | LocalDate | 否 | 结束日期，格式 yyyy-MM-dd |

**成功响应:** `BaseResponse<Long>` — 返回新建项目 ID

---

#### GET /project/get/{id} — 获取项目详情

**路径参数:** `id` (Long) — 项目 ID

**成功响应:** `BaseResponse<ProjectVo>`

```json
{
  "code": 0,
  "message": "OK",
  "data": {
    "id": 1901234567890123456,
    "userId": 1001,
    "name": "英语六级冲刺",
    "goal": "三个月内通过英语六级考试",
    "status": 0,
    "orderNo": 0,
    "icon": "📚",
    "color": "#4A90D9",
    "startDate": "2026-04-01",
    "endDate": "2026-06-30",
    "createTime": "2026-04-01T09:00:00",
    "updateTime": "2026-04-01T09:00:00"
  }
}
```

注意：ProjectVo 不包含 progress 字段。

---

#### GET /project/list — 获取项目列表（分页）

**查询参数:**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| pageNum | Long | 1 | 页码 |
| pageSize | Long | 10 | 每页数量 |
| status | Integer | 无 | 筛选：0=进行中，1=已归档，null=全部 |
| keyword | String | 无 | 模糊搜索项目名称 |

**成功响应:** `BaseResponse<Page<ProjectVo>>`

```json
{
  "code": 0,
  "message": "OK",
  "data": {
    "total": 5,
    "size": 10,
    "current": 1,
    "records": [...]
  }
}
```

---

#### POST /project/update — 更新项目

**请求体（ProjectUpdateRequest）:**

```json
{
  "id": 1901234567890123456,
  "name": "英语六级冲刺（修订）",
  "goal": "更新后的目标",
  "icon": "📖",
  "color": "#FF6B6B",
  "status": 0,
  "startDate": "2026-04-15",
  "endDate": "2026-07-15"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Long | 是 | 项目 ID |
| name | String | 否 | 新名称 |
| goal | String | 否 | 新目标 |
| icon | String | 否 | 新图标 |
| color | String | 否 | 新颜色 |
| status | Integer | 否 | 新状态（0进行中，1归档） |
| startDate | LocalDate | 否 | 新开始日期 |
| endDate | LocalDate | 否 | 新结束日期 |

---

#### POST /project/reorder — 批量排序

**请求体:** `List<ProjectReorderRequest>`

```json
[
  { "id": 1901234567890123456, "orderNo": 0 },
  { "id": 1901234567890123457, "orderNo": 1 },
  { "id": 1901234567890123458, "orderNo": 2 }
]
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Long | 是 | 项目 ID |
| orderNo | Integer | 是 | 新的排序序号（越小越靠前） |

---

#### POST /project/archive — 归档项目

**请求体:** `List<Long>` — 项目 ID 列表

```json
[1901234567890123456, 1901234567890123457]
```

---

#### POST /project/delete/{id} — 删除项目（软删除）

**路径参数:** `id` (Long) — 项目 ID

软删除后，项目下关联的里程碑和任务也会被级联软删除（deleteSource=2）。

---

#### POST /project/recover/{id} — 恢复项目

**路径参数:** `id` (Long) — 项目 ID

恢复已软删除的项目。

---

### MilestoneController

#### POST /milestone/add — 创建里程碑

**请求体（MilestoneCreateRequest）:**

```json
{
  "projectId": 1901234567890123456,
  "name": "第1-2周：词汇基础"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| projectId | Long | 是 | 所属项目 ID |
| name | String | 是 | 里程碑名称 |

---

#### GET /milestone/list — 获取里程碑列表

**查询参数:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| projectId | Long | 是 | 项目 ID |
| keyword | String | 否 | 模糊搜索名称 |

**成功响应:** `BaseResponse<List<MilestoneVo>>`

```json
{
  "code": 0,
  "message": "OK",
  "data": [
    {
      "id": 2901234567890123456,
      "projectId": 1901234567890123456,
      "userId": 1001,
      "name": "第1-2周：词汇基础",
      "orderNo": 0,
      "progress": 60.00,
      "createTime": "2026-04-01T09:00:00",
      "updateTime": "2026-04-15T11:20:00"
    }
  ]
}
```

---

#### POST /milestone/update — 更新里程碑

**请求体（MilestoneUpdateRequest）:**

```json
{
  "id": 2901234567890123456,
  "name": "第1-2周：词汇基础（修订）",
  "orderNo": 1,
  "progress": 75.00
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Long | 是 | 里程碑 ID |
| name | String | 否 | 新名称 |
| orderNo | Integer | 否 | 新排序序号 |
| progress | BigDecimal | 否 | 新进度百分比 |

---

#### POST /milestone/delete/{id} — 删除里程碑

**路径参数:** `id` (Long) — 里程碑 ID

---

### TaskController

#### POST /task/add — 创建任务

**请求体（TaskCreateRequest）:**

```json
{
  "title": "每天背诵50个单词",
  "description": "使用单词APP背诵",
  "projectId": 1901234567890123456,
  "milestoneId": 2901234567890123456,
  "priority": 2,
  "dueDate": "2026-04-20"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | String | 是 | 任务标题（最大60字符） |
| description | String | 否 | 任务描述（最大550字符） |
| projectId | Long | 是 | 所属项目 ID |
| milestoneId | Long | 否 | 所属里程碑 ID（可为空） |
| priority | Integer | 否 | 优先级（默认0，数值越大越高） |
| dueDate | LocalDate | 否 | 截止日期，格式 yyyy-MM-dd |

---

#### GET /task/get/{id} — 获取任务详情

**路径参数:** `id` (Long) — 任务 ID

**成功响应:** `BaseResponse<TaskVo>`

---

#### GET /task/list — 获取任务列表（分页）

**查询参数:**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| projectId | Long | 无 | 筛选项目 |
| status | Integer | 无 | 筛选状态：0=未完成，1/2/3=已完成 |
| isOverdue | Boolean | 无 | true=只返回已逾期且未完成的任务 |
| current | Integer | 1 | 页码 |
| size | Integer | 10 | 每页数量 |

**成功响应:** `BaseResponse<Page<TaskVo>>`

---

#### POST /task/update — 更新任务

**请求体（TaskUpdateRequest）:**

```json
{
  "id": 3901234567890123456,
  "title": "每天背诵50个单词（修订）",
  "status": 1,
  "priority": 3,
  "dueDate": "2026-04-25",
  "milestoneId": 2901234567890123456
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Long | 是 | 任务 ID |
| title | String | 否 | 新标题 |
| description | String | 否 | 新描述 |
| status | Integer | 否 | 新状态：0=未完成，1/2/3=已完成 |
| priority | Integer | 否 | 新优先级 |
| dueDate | LocalDate | 否 | 新截止日期 |
| milestoneId | Long | 否 | 新里程碑 ID（设为 null 可取消归组） |

注意：设置 status >= 1 时，completedAt 会自动记录当前时间。

---

#### POST /task/delete/{id} — 删除任务（软删除）

**路径参数:** `id` (Long) — 任务 ID

---

#### POST /task/batch-rename — 批量应用改名建议

根据 AI 生成的改名建议（operationId 关联），批量更新任务标题。只更新标题字段，且只有旧标题与数据库当前标题一致的任务才会被更新（防并发冲突）。

**请求体（TaskBatchRenameRequest）:**

```json
{
  "operationId": "20260418_rename_9ab27d5f",
  "items": [
    { "taskId": 101, "oldTitle": "背单词", "newTitle": "完成核心词汇第11-12单元记忆" },
    { "taskId": 102, "oldTitle": "听力练习", "newTitle": "完成听力短对话练习10篇" }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| operationId | String | 是 | 建议批次ID（来自 /ai/daily-review/suggest-rename 返回的 operationId） |
| items | List\<TaskRenameItemDTO\> | 是 | 确认改名条目列表 |

**TaskRenameItemDTO 字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| taskId | Long | 任务 ID |
| oldTitle | String | 改名前标题（用于校验，防止并发修改冲突） |
| newTitle | String | 改名后标题 |

**成功响应:** `BaseResponse<TaskBatchRenameVO>`

```json
{
  "code": 0,
  "message": "OK",
  "data": {
    "operationId": "20260418_rename_9ab27d5f",
    "successCount": 5,
    "skipCount": 1,
    "updatedTaskIds": [101, 102, 103, 104, 105]
  }
}
```

**TaskBatchRenameVO 字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| operationId | String | 建议批次ID |
| successCount | Integer | 成功改名数量 |
| skipCount | Integer | 跳过数量（标题已被他人修改，不一致） |
| updatedTaskIds | List\<Long\> | 成功更新的任务ID列表 |

---

#### POST /task/batch-rename/rollback — 回滚批量改名

根据批次ID，将该批次下所有成功改名的任务恢复到原标题。

**请求体（TaskBatchRollbackRequest）:**

```json
{
  "operationId": "20260418_rename_9ab27d5f"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| operationId | String | 是 | 建议批次ID |

**成功响应:** `BaseResponse<TaskBatchRollbackVO>`

```json
{
  "code": 0,
  "message": "OK",
  "data": {
    "operationId": "20260418_rename_9ab27d5f",
    "rollbackCount": 5
  }
}
```

**TaskBatchRollbackVO 字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| operationId | String | 建议批次ID |
| rollbackCount | Integer | 成功回滚数量 |

---

## 实体关系

```
Project (1) ──────< (多个) Milestone
  │
  └─────< (多个) Task  <─────┘
```

- 一个 **Project** 包含多个 **Milestone** 和 **Task**
- 一个 **Milestone** 可包含多个 **Task**（milestoneId 关联）
- 一个 **Task** 属于一个 **Milestone**（可为空，表示未归组）
- 删除 Project 会级联软删除其下所有 Milestone 和 Task（deleteSource=2）
