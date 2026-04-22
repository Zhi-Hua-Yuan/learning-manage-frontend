# 周回顾 / 统计 / AI 接口 (WeeklyReview / Stats / AI API)

## 概述

- **Base URL**: `http://localhost:8123/api`
- **认证**: 所有接口均需携带 `Authorization: Bearer <token>`

---

## 1. 周回顾（WeeklyReview）

### 实体字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 ID |
| userId | Long | 所属用户 ID（后端自动注入） |
| year | Integer | 年份，如 2026 |
| weekNo | Integer | 第几周（ISO 周号），范围 1-53 |
| startDate | LocalDate | 本周周一日期 |
| endDate | LocalDate | 本周周日日期 |
| completedTaskCount | Integer | 本周完成任务数快照（保存时系统自动统计） |
| focusProjectName | String | 本周重点项目名称快照 |
| reflection | String | 本周反思内容 |
| nextPlan | String | 下周计划内容 |
| createTime | LocalDateTime | 首次创建时间 |
| updateTime | LocalDateTime | 最近更新时间 |

**数据库唯一约束**: userId + year + weekNo，确保每用户每周只有一条记录。

---

### GET /review/current — 获取当前周草稿

获取当前周（按系统日期计算）的周总结。如已有记录则返回；否则动态生成草稿返回（id=null，前端可修改后保存）。

**请求参数:** 无

**成功响应:**

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
    "focusProjectName": "英语六级冲刺",
    "reflection": null,
    "nextPlan": null,
    "createTime": null,
    "updateTime": null
  }
}
```

---

### POST /review/save — 保存或更新周总结

根据 year + weekNo 判断：已存在则更新，不存在则新增。适合"一键保存"场景。

**请求体:** `WeeklyReview` 对象

```json
{
  "year": 2026,
  "weekNo": 16,
  "startDate": "2026-04-13",
  "endDate": "2026-04-19",
  "completedTaskCount": 7,
  "focusProjectName": "英语六级冲刺",
  "reflection": "本周完成了高数前三章的练习，进度符合预期",
  "nextPlan": "下周开始线性代数的学习"
}
```

注意：`userId` 后端自动注入，前端不传；`id`、`createTime`、`updateTime` 由后端管理。

**成功响应:**

```json
{
  "code": 0,
  "message": "OK",
  "data": true
}
```

---

### GET /review/{id} — 获取周总结详情

**路径参数:** `id` (Long) — 周总结 ID

**成功响应:**

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
    "focusProjectName": "英语六级冲刺",
    "reflection": "本周完成了高数前三章的练习，进度符合预期",
    "nextPlan": "下周开始线性代数的学习",
    "createTime": "2026-04-19T22:00:00",
    "updateTime": "2026-04-19T22:30:00"
  }
}
```

只能查看自己的记录（后端校验 userId 匹配）。

---

### POST /review/update — 部分更新周总结

主要用于更新反思和计划内容。

**请求体:**

```json
{
  "id": 8901234567890,
  "reflection": "更新后的反思内容",
  "nextPlan": "更新后的下周计划",
  "focusProjectName": "线性代数"
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

### POST /review/delete/{id} — 删除周总结

**路径参数:** `id` (Long) — 周总结 ID

软删除（is_delete=1）。

---

### GET /review/history — 获取历史周总结列表

返回当前用户所有历史周总结，按 year 升序、weekNo 降序排列（最近一周最前）。

**请求参数:** 无

**成功响应:**

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
      "focusProjectName": "英语六级冲刺",
      "reflection": "...",
      "nextPlan": "...",
      "createTime": "2026-04-19T22:00:00",
      "updateTime": "2026-04-19T22:30:00"
    }
  ]
}
```

---

## 2. 数据统计（Stats）

### GET /stats/overview — 获取仪表盘概览

一次性返回当前用户的 Dashboard 全量数据，用于前端渲染首页仪表盘。

**请求参数:** 无

**成功响应:** `BaseResponse<DashboardVO>`

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

### DashboardVO 结构

| 字段 | 类型 | 说明 |
|------|------|------|
| coreMetrics | CoreMetricsVO | 核心指标快照 |
| dailyTrends | List\<DailyTrendVO\> | 近7日每日完成任务趋势 |
| projectRankings | List\<ProjectRankingVO\> | 项目进度排行 |

### CoreMetricsVO（核心指标）

| 字段 | 类型 | 说明 |
|------|------|------|
| ongoingProjectCount | Integer | 进行中的项目数（未归档） |
| overdueTaskCount | Integer | 已逾期且未完成的任务数 |
| dueTodayTaskCount | Integer | 今日到期且未完成的任务数 |

### DailyTrendVO（每日趋势）

| 字段 | 类型 | 说明 |
|------|------|------|
| date | String | 日期，格式 yyyy-MM-dd |
| completedCount | Integer | 当日完成任务数 |

### ProjectRankingVO（项目排名）

| 字段 | 类型 | 说明 |
|------|------|------|
| projectName | String | 项目名称 |
| progress | Integer | 进度百分比（0-100） |

---

## 3. AI 辅助

### POST /ai/breakdown — 任务拆解

根据学习目标自动生成里程碑与任务草稿。

**请求体（AiBreakdownRequest）:**

```json
{
  "target": "三个月内通过英语六级",
  "description": "目前词汇和听力较弱，希望系统提升",
  "duration": "12周",
  "detailed": true
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| target | String | 是 | 学习目标 |
| description | String | 否 | 补充描述 |
| duration | String | 是 | 期望周期（如 "12周"、"3个月"） |
| detailed | Boolean | 否 | true=详细拆解，false=默认（默认 false） |

**成功响应:** `BaseResponse<List<MilestoneDraftVO>>`

```json
{
  "code": 0,
  "message": "OK",
  "data": [
    {
      "name": "第1-2周：词汇基础夯实",
      "tasks": [
        { "name": "每天背诵50个六级核心词汇", "priority": 2, "dueDate": "2026-04-28" },
        { "name": "完成词根词缀笔记整理", "priority": 1, "dueDate": "2026-04-30" },
        { "name": "周末词汇小测，正确率需达80%", "priority": 2, "dueDate": "2026-05-03" }
      ]
    },
    {
      "name": "第3-4周：听力入门",
      "tasks": [
        { "name": "每天听写一段短对话", "priority": 2, "dueDate": "2026-05-05" },
        { "name": "整理高频场景词汇表", "priority": 1, "dueDate": "2026-05-07" }
      ]
    }
  ]
}
```

**MilestoneDraftVO 字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| name | String | 里程碑名称 |
| tasks | List\<TaskDraftVO\> | 该里程碑下的任务草稿列表 |

**TaskDraftVO 字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| name | String | 任务名称 |
| priority | Integer | 任务优先级：0=无/稍后，1=低，2=中，3=高 |
| dueDate | String | 任务截止日期（yyyy-MM-dd） |

---

### POST /ai/today-order/recommend — 今日任务推荐顺序

根据今天到期任务，结合难度、成本、效益等因素，AI 生成推荐完成顺序。

**请求体（AiTodayOrderRequest）:**

```json
{
  "taskIds": [101, 102, 103],
  "timezone": "Asia/Shanghai",
  "now": "2026-04-17T10:30:00",
  "strategy": "balanced",
  "limit": 20
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| taskIds | List\<Long\> | 否 | 任务ID列表（为空则自动查询今天到期且未完成的任务） |
| timezone | String | 否 | 时区，默认 Asia/Shanghai |
| now | String | 否 | 当前时间（ISO-8601格式），用于指定"今天" |
| strategy | String | 否 | 偏好策略：balanced/benefit_first/quick_win，默认 balanced |
| limit | Integer | 否 | 最多返回任务数（1-50），默认 20 |

**成功响应:** `BaseResponse<AiTodayOrderVO>`

```json
{
  "code": 0,
  "message": "OK",
  "data": {
    "strategy": "balanced",
    "generatedAt": "2026-04-17T10:30:02",
    "fallbackUsed": false,
    "items": [
      {
        "taskId": 102,
        "title": "完成核心词汇第1-10单元",
        "rank": 1,
        "score": 88,
        "difficulty": 3,
        "cost": 2,
        "benefit": 5,
        "estimatedMinutes": 30,
        "reason": "效益高且可在30分钟内完成，建议优先处理"
      }
    ]
  }
}
```

**AiTodayOrderVO 字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| strategy | String | 采用的策略：balanced/benefit_first/quick_win |
| generatedAt | String | 生成时间（ISO-8601） |
| fallbackUsed | Boolean | 是否使用规则兜底（AI失败时启用按优先级/创建时间的备用排序） |
| items | List\<AiTaskOrderItemVO\> | 推荐任务列表 |

**AiTaskOrderItemVO 字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| taskId | Long | 任务 ID |
| title | String | 任务标题 |
| rank | Integer | 推荐顺位（从 1 开始） |
| score | Integer | 综合评分（0-100） |
| difficulty | Integer | 难度（1-5） |
| cost | Integer | 成本/耗时（1-5） |
| benefit | Integer | 效益（1-5） |
| estimatedMinutes | Integer | 预估耗时（分钟） |
| reason | String | 推荐原因 |

---

### POST /ai/list/replan/preview — 清单任务智能重排预览

生成重排结果供前端确认，不直接落库。前端展示预览后用户可选择确认或取消。

**请求体（AiListReplanPreviewRequest）:**

```json
{
  "listId": 1001
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| listId | Long | 是 | 清单ID（对应 project.id） |

**成功响应:** `BaseResponse<AiListReplanPreviewVO>`

```json
{
  "code": 0,
  "message": "OK",
  "data": {
    "operationId": "20260422_replan_9ab27d5f",
    "changedCount": 5,
    "previewTasks": [
      {
        "taskId": 101,
        "oldTitle": "背单词",
        "newTitle": "完成核心词汇第1-12单元记忆",
        "oldPriority": 1,
        "newPriority": 3,
        "oldDueDate": "2026-04-22",
        "newDueDate": "2026-04-20",
        "confidence": 86,
        "reason": "根据执行节奏和收益优先级调整"
      }
    ]
  }
}
```

**AiListReplanPreviewVO 字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| operationId | String | 重排操作ID（后续确认/取消时需传入） |
| changedCount | Integer | 发生变化的任务数量 |
| previewTasks | List\<AiListReplanPreviewItemVO\> | 重排预览任务列表 |

**AiListReplanPreviewItemVO 字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| taskId | Long | 任务 ID |
| oldTitle | String | 原任务标题 |
| newTitle | String | 建议任务标题 |
| oldPriority | Integer | 原优先级 |
| newPriority | Integer | 建议优先级 |
| oldDueDate | String | 原截止日期（yyyy-MM-dd） |
| newDueDate | String | 建议截止日期（yyyy-MM-dd） |
| confidence | Integer | 建议置信度（0-100） |
| reason | String | 建议原因 |

---

### POST /ai/list/replan/confirm — 清单任务智能重排确认

确认预览结果并入库。执行后将按预览结果更新任务的标题、优先级、截止日期，并同步更新项目结束日期。

**请求体（AiListReplanConfirmRequest）:**

```json
{
  "listId": 1001,
  "operationId": "20260422_replan_9ab27d5f"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| listId | Long | 是 | 清单ID（对应 project.id） |
| operationId | String | 是 | 重排操作ID（来自 preview 返回） |

**成功响应:** `BaseResponse<Boolean>`

```json
{
  "code": 0,
  "message": "OK",
  "data": true
}
```

**返回值说明：**

| 值 | 说明 |
|----|------|
| true | 确认成功，已更新任务数据 |
| false | 确认失败（可能操作已过期或已被取消） |

---

### POST /ai/list/replan/cancel — 清单任务智能重排取消

取消本次预览结果，不入库。

**请求体（AiListReplanCancelRequest）:**

```json
{
  "operationId": "20260422_replan_9ab27d5f"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| operationId | String | 是 | 重排操作ID（来自 preview 返回） |

**成功响应:** `BaseResponse<Boolean>`

```json
{
  "code": 0,
  "message": "OK",
  "data": true
}
```

---

### POST /ai/polish — 周总结润色

根据用户填写的任务 ID 列表和反思内容，AI 生成结构化、表达流畅的周总结润色文本。**注意：此接口不再返回下周计划（plan），仅返回复盘内容（review）。**

**请求体（AiPolishRequest）:**

```json
{
  "taskIds": [1001, 1002, 1003],
  "reflection": "执行力有进步，但时间分配仍需优化"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| taskIds | List\<Long\> | 否 | 本周已完成的任务 ID 列表（传入后AI根据具体任务内容生成更精准的润色） |
| reflection | String | 否 | 用户原始反思内容，AI 在此基础上润色 |

**成功响应:** `BaseResponse<String>` — 返回值为 JSON 字符串

```json
{
  "code": 0,
  "message": "OK",
  "data": "{\"review\":\"本周共完成任务 8 项，涵盖英语六级词汇第二轮复习、高数第四章练习及 Spring Boot 笔记整理。在执行力方面较上周有明显进步，能够按时完成每日计划。但时间分配上仍有优化空间。\"}"
}
```

**响应 data 字段解析：**

| 字段 | 类型 | 说明 |
|------|------|------|
| review | String | AI 生成的周复盘内容（100-220字） |

**注意**：

- 此接口不再返回 `plan` 字段
- 如果本周无已完成任务，返回的 review 中会包含建议内容

### POST /ai/daily-review/suggest-rename — 日报回顾任务改名建议

根据当天（或指定日期）未完成任务，AI 为其生成仅标题层面的改名建议（不落库）。前端展示建议后，用户可选择性批量应用。

**请求体（DailyReviewSuggestRenameRequest）:**

```json
{
  "reviewDate": "2026-04-18",
  "strategy": "balanced",
  "maxEdits": 10,
  "taskIds": [101, 102, 103]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| reviewDate | String | 否 | 回顾日期（yyyy-MM-dd），为空默认今天 |
| strategy | String | 否 | 偏好策略：balanced（平衡）/clarity_first（清晰优先），默认 balanced |
| maxEdits | Integer | 否 | 最大改名数（1-50），为空默认全部未完成任务 |
| taskIds | List\<Long\> | 否 | 任务ID列表（空则使用当天到期任务） |

**成功响应:** `BaseResponse<DailyReviewSuggestRenameVO>`

```json
{
  "code": 0,
  "message": "OK",
  "data": {
    "operationId": "20260418_rename_9ab27d5f",
    "generatedAt": "2026-04-18T21:10:12",
    "reviewDate": "2026-04-18",
    "items": [
      {
        "taskId": 101,
        "oldTitle": "背单词",
        "newTitle": "完成核心词汇第11-12单元记忆",
        "reason": "标题更具体，可直接执行和验收",
        "confidence": 86
      }
    ]
  }
}
```

**DailyReviewSuggestRenameVO 字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| operationId | String | 建议批次ID（后续批量改名/回滚时需传入） |
| generatedAt | String | 建议生成时间（ISO-8601） |
| reviewDate | String | 回顾日期 |
| items | List\<TitleRenameSuggestionItemVO\> | 改名建议列表 |

**TitleRenameSuggestionItemVO 字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| taskId | Long | 任务 ID |
| oldTitle | String | 原任务名称 |
| newTitle | String | 建议新任务名称 |
| reason | String | 建议原因 |
| confidence | Integer | 建议置信度（0-100） |

---

## 统一响应格式

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
| code | int | 0=成功；非0=失败 |
| message | String | 状态描述 |
| data | Object/Array | 成功时返回业务数据 |

### 常用错误码

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 40000 | 请求参数错误 |
| 40100 | 未登录 |
| 40101 | 无权限 |
| 40400 | 请求数据不存在 |
| 50001 | 操作失败 |
