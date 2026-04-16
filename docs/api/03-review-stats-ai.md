# WeeklyReview / Stats / AI 模块 API 文档

---

## 1. WeeklyReview 模块

对应控制器：`WeeklyReviewController`，基础路径 `/api/review`

> **认证说明**：所有接口均需要登录态（通过登录接口获取 `code=0` 即成功）。接口通过拦截器从请求上下文获取当前登录用户的 `userId`。

### 1.1 WeeklyReview 实体字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | Long | 主键 ID，全局唯一，由 MyBatis Plus  ASSIGN_ID 生成 |
| `userId` | Long | 所属用户 ID（自动取自当前登录上下文，无需前端传入） |
| `year` | Integer | 年份，如 `2026` |
| `weekNo` | Integer | 当年第几周（ISO 周号），范围 1–53 |
| `startDate` | LocalDate | 本周周一日期（如 `2026-04-07`） |
| `endDate` | LocalDate | 本周周日日期（如 `2026-04-13`） |
| `completedTaskCount` | Integer | **本周完成任务数快照**——提交周总结时系统自动统计本周已完成的 Task 数量并写入，反应当时的工作量 |
| `focusProjectName` | String | **本周重点项目名称快照**——用户在周总结中标注的侧重点项目名，用于后续数据统计和趋势分析 |
| `reflection` | String | 本周反思内容（用户填写的自由文本） |
| `nextPlan` | String | 下周计划内容（用户填写的自由文本） |
| `createTime` | LocalDateTime | 首次创建时间 |
| `updateTime` | LocalDateTime | 最近一次更新时间 |

**数据库唯一约束**：`user_id + year + week_no` 联合唯一，确保每个用户每周只有一条周总结记录。

---

### 1.2 获取当前周总结草稿

```
GET /api/review/current
```

**描述**：获取当前周（按系统时钟计算）的周总结。如果数据库中已有记录则直接返回；否则根据当前周日期范围动态生成一份草稿返回（`id` 为 `null`，用户可在此基础上修改后提交保存）。

**请求参数**：无

**响应**

```json
{
  "code": 0,
  "message": "OK",
  "data": {
    "id": null,
    "userId": 1234567890,
    "year": 2026,
    "weekNo": 16,
    "startDate": "2026-04-13",
    "endDate": "2026-04-19",
    "completedTaskCount": 5,
    "focusProjectName": "数学复习",
    "reflection": null,
    "nextPlan": null,
    "createTime": null,
    "updateTime": null
  }
}
```

| 响应字段 | 说明 |
|----------|------|
| `code` | 0 = 成功，非 0 = 失败 |
| `data` | 当前周总结草稿，`id` 为 `null` 表示尚未保存过 |

---

### 1.3 保存或更新周总结

```
POST /api/review/save
Content-Type: application/json
```

**描述**：根据 `year` + `weekNo` 判断——若数据库中该用户该年该周已有记录则更新（覆盖所有可写字段），否则新增。适合"一键保存"场景。

**请求体**（`WeeklyReview`）：

```json
{
  "year": 2026,
  "weekNo": 16,
  "startDate": "2026-04-13",
  "endDate": "2026-04-19",
  "completedTaskCount": 7,
  "focusProjectName": "数学复习",
  "reflection": "本周完成了高数前三章的练习，进度符合预期",
  "nextPlan": "下周开始线性代数的学习"
}
```

> `userId` 由后端自动注入，前端无需传入。`id`、`createTime`、`updateTime` 由后端管理，前端不应传入。

**响应**

```json
{
  "code": 0,
  "message": "OK",
  "data": true
}
```

**错误码**：`PARAMS_ERROR`（请求参数为空）

---

### 1.4 获取周总结详情

```
GET /api/review/{id}
```

**描述**：根据主键 ID 获取特定周总结的完整信息。只能查看自己创建的记录（后端校验 `userId` 匹配）。

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | Long | 是 | 周总结主键 ID |

**响应**

```json
{
  "code": 0,
  "message": "OK",
  "data": {
    "id": 8901234567890,
    "userId": 1234567890,
    "year": 2026,
    "weekNo": 16,
    "startDate": "2026-04-13",
    "endDate": "2026-04-19",
    "completedTaskCount": 7,
    "focusProjectName": "数学复习",
    "reflection": "本周完成了高数前三章的练习，进度符合预期",
    "nextPlan": "下周开始线性代数的学习",
    "createTime": "2026-04-19T22:00:00",
    "updateTime": "2026-04-19T22:30:00"
  }
}
```

**错误码**：`PARAMS_ERROR`（id 为空或 <= 0）

---

### 1.5 更新周总结（部分更新）

```
POST /api/review/update
Content-Type: application/json
```

**描述**：仅允许修改当前用户自己的周总结内容。`year`、`weekNo`、`startDate`、`endDate` 等基础字段通常不修改，主要用于更新 `reflection`、`nextPlan` 等文本内容。

**请求体**（`WeeklyReview`）：

```json
{
  "id": 8901234567890,
  "reflection": "更新后的反思内容",
  "nextPlan": "更新后的下周计划",
  "focusProjectName": "线性代数"
}
```

**响应**

```json
{
  "code": 0,
  "message": "OK",
  "data": true
}
```

---

### 1.6 删除周总结

```
POST /api/review/delete/{id}
```

**描述**：仅允许删除当前用户自己的周总结。执行逻辑删除（`is_delete = 1`）。

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | Long | 是 | 周总结主键 ID |

**响应**

```json
{
  "code": 0,
  "message": "OK",
  "data": true
}
```

---

### 1.7 获取历史周总结列表

```
GET /api/review/history
```

**描述**：返回当前用户所有历史周总结，按 `year` 升序、`weekNo` 降序排列（最近一周排在最前）。

**请求参数**：无

**响应**

```json
{
  "code": 0,
  "message": "OK",
  "data": [
    {
      "id": 8901234567890,
      "year": 2026,
      "weekNo": 16,
      "startDate": "2026-04-13",
      "endDate": "2026-04-19",
      "completedTaskCount": 7,
      "focusProjectName": "数学复习",
      "reflection": "...",
      "nextPlan": "...",
      "createTime": "2026-04-19T22:00:00",
      "updateTime": "2026-04-19T22:30:00"
    },
    {
      "id": 7801234567890,
      "year": 2026,
      "weekNo": 15,
      "startDate": "2026-04-06",
      "endDate": "2026-04-12",
      "completedTaskCount": 4,
      "focusProjectName": "英语学习",
      "reflection": "...",
      "nextPlan": "...",
      "createTime": "2026-04-12T21:00:00",
      "updateTime": "2026-04-12T21:00:00"
    }
  ]
}
```

---

## 2. Stats（数据统计）模块

对应控制器：`StatsController`，基础路径 `/api/stats`

提供登录用户的核心指标概览，用于仪表盘（Dashboard）展示。

### 2.1 DashboardVO 整体结构

```json
{
  "coreMetrics": { ... },
  "dailyTrends": [ ... ],
  "projectRankings": [ ... ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `coreMetrics` | CoreMetricsVO | 当前核心指标快照 |
| `dailyTrends` | List\<DailyTrendVO\> | 每日完成任务趋势（近7天或当前周内） |
| `projectRankings` | List\<ProjectRankingVO\> | 项目进度排行榜 |

### 2.2 CoreMetricsVO（核心指标）

| 字段 | 类型 | 说明 |
|------|------|------|
| `ongoingProjectCount` | Integer | **进行中的项目数**——当前用户状态下为"进行中"（未归档）的项目总数 |
| `overdueTaskCount` | Integer | **逾期且未完成的任务数**——截止日期早于今天且 `status` 未标记为完成的任务数量（越高代表积压越严重） |
| `dueTodayTaskCount` | Integer | **今日到期且未完成的任务数**——截止日期等于今天的未完成任务数（提醒用户当天要完成的工作） |

### 2.3 DailyTrendVO（每日趋势）

| 字段 | 类型 | 说明 |
|------|------|------|
| `date` | String | 日期，格式 `yyyy-MM-dd`（如 `"2026-04-13"`） |
| `completedCount` | Integer | 当日完成任务数 |

### 2.4 ProjectRankingVO（项目排名）

| 字段 | 类型 | 说明 |
|------|------|------|
| `projectName` | String | 项目名称 |
| `progress` | Integer | 项目整体进度百分比（0–100） |

---

### 2.5 获取仪表盘概览

```
GET /api/stats/overview
```

**描述**：一次性返回当前登录用户的 Dashboard 全量数据，聚合了项目状态、任务逾期情况、每日完成趋势和项目进度排名，用于前端渲染首页仪表盘。

**请求参数**：无

**响应**

```json
{
  "code": 0,
  "message": "OK",
  "data": {
    "coreMetrics": {
      "ongoingProjectCount": 3,
      "overdueTaskCount": 2,
      "dueTodayTaskCount": 1
    },
    "dailyTrends": [
      { "date": "2026-04-13", "completedCount": 2 },
      { "date": "2026-04-14", "completedCount": 3 },
      { "date": "2026-04-15", "completedCount": 1 },
      { "date": "2026-04-16", "completedCount": 0 },
      { "date": "2026-04-17", "completedCount": 4 },
      { "date": "2026-04-18", "completedCount": 2 },
      { "date": "2026-04-19", "completedCount": 1 }
    ],
    "projectRankings": [
      { "projectName": "英语六级冲刺", "progress": 65 },
      { "projectName": "数学复习", "progress": 42 },
      { "projectName": "Spring Boot 进阶", "progress": 20 }
    ]
  }
}
```

---

## 3. AI 模块

对应控制器：`AiController`，基础路径 `/api/ai`

提供 AI 辅助功能，调用阿里云 Qwen 模型进行任务拆解和周总结润色。

### 3.1 AiBreakdownRequest（任务拆解请求）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `target` | String | **是** | 学习目标，如 `"三个月内通过英语六级"` |
| `description` | String | 否 | 补充描述，如 `"目前词汇和听力较弱，希望系统提升"` |
| `duration` | String | **是** | 期望周期，如 `"12周"`、`"3个月"` |
| `detailed` | Boolean | 否 | `true` = 详细拆解（每个里程碑下多个任务），`false` = 默认拆解。默认 `false` |

### 3.2 AiPolishRequest（周总结润色请求）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|
| `taskCount` | Integer | **是** | 本周完成任务总数（不能为负数） |
| `taskIds` | List\<Long\> | 否 | 本周已完成任务 ID 列表。传入后 AI 会根据具体任务内容生成更精准的润色文本 |
| `reflection` | String | 否 | 用户原始反思内容，AI 在此基础上润色加工 |

### 3.3 MilestoneDraftVO / TaskDraftVO（拆解结果）

- `MilestoneDraftVO.name`：里程碑名称，如 `"第1周：词汇基础夯实"`
- `MilestoneDraftVO.tasks`：该里程碑下的子任务列表
- `TaskDraftVO.name`：单个任务名称，如 `"每天背诵 50 个单词"`

---

### 3.4 任务拆解

```
POST /api/ai/breakdown
Content-Type: application/json
```

**描述**：根据用户提供的学习目标和周期，自动生成里程碑与任务草稿。适用于规划新项目的场景——输入一个笼统的目标，AI 输出可执行的任务层级结构。

**请求体**

```json
{
  "target": "三个月内通过英语六级",
  "description": "目前词汇和听力较弱，希望系统提升",
  "duration": "12周",
  "detailed": true
}
```

**响应**

```json
{
  "code": 0,
  "message": "OK",
  "data": [
    {
      "name": "第1-2周：词汇基础夯实",
      "tasks": [
        { "name": "每天背诵50个六级核心词汇" },
        { "name": "完成词根词缀笔记整理" },
        { "name": "周末词汇小测，正确率需达80%" }
      ]
    },
    {
      "name": "第3-4周：听力入门",
      "tasks": [
        { "name": "每天听写一段短对话" },
        { "name": "整理高频场景词汇表" },
        { "name": "完成2套听力模拟题" }
      ]
    },
    {
      "name": "第5-8周：专项突破",
      "tasks": [
        { "name": "阅读：每天2篇真题阅读" },
        { "name": "听力：精听3篇短文并跟读" },
        { "name": "写作：背诵10篇范文并仿写" }
      ]
    },
    {
      "name": "第9-12周：模拟冲刺",
      "tasks": [
        { "name": "每周完成1套全真模拟题" },
        { "name": "整理错题本并复盘" },
        { "name": "调整作息，熟悉考试节奏" }
      ]
    }
  ]
}
```

**错误码**
- `PARAMS_ERROR`：`target` 或 `duration` 为空

---

### 3.5 周总结润色

```
POST /api/ai/polish
Content-Type: application/json
```

**描述**：根据用户填写的完成任务数、可选的任务 ID 列表和反思内容，由 AI 生成一段结构化、表达流畅的周总结润色文本。适用于用户不知道如何组织周总结语言时一键生成。

**请求体**

```json
{
  "taskCount": 8,
  "taskIds": [1001, 1002, 1003],
  "reflection": "执行力有进步，但时间分配仍需优化"
}
```

**响应**

```json
{
  "code": 0,
  "message": "OK",
  "data": "本周共完成任务 8 项，涵盖英语六级词汇第二轮复习、高数第四章练习及 Spring Boot 笔记整理。在执行力方面较上周有明显进步，能够按时完成每日计划。但时间分配上仍有优化空间——周三因临时会议导致数学复习中断，下周将尝试将高难度任务安排在上午，避开不确定因素的干扰。下一周将继续保持词汇背诵节奏，重点推进听力专项训练。"
}
```

**错误码**
- `PARAMS_ERROR`：`taskCount` 为空或为负数

---

## 4. 统一响应格式

所有接口均遵循以下统一响应结构：

```json
{
  "code": 0,
  "message": "OK",
  "data": { ... }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | int | `0` = 成功；非 `0` = 失败（见错误码表） |
| `message` | String | 状态描述文本 |
| `data` | Object/Array | 成功时返回业务数据；失败时可能为 `null` |

**常用错误码**（参见 `ErrorCode` 枚举）：

| 错误码 | 说明 |
|--------|------|
| `PARAMS_ERROR` | 请求参数为空或格式错误 |
| `NOT_LOGIN_ERROR` | 用户未登录 |
| `NO_AUTH_ERROR` | 无权限访问该资源 |
| `OPERATION_ERROR` | 业务操作失败 |
