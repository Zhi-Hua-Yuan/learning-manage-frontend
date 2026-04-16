# Project / Milestone / Task API

Base URL: `/api`

---

## Common Response Format

All endpoints return a `BaseResponse<T>` wrapper:

```json
{
  "code": 0,
  "message": "OK",
  "data": { ... }
}
```

| code | meaning |
|------|--------|
| `0`  | Success |
| `*`  | Error — see `message` for details |

---

## Data Models

### Project Entity

| Field       | Type           | Description |
|-------------|----------------|-------------|
| `id`        | `Long`         | Unique primary key |
| `userId`    | `Long`         | Owner user ID |
| `name`      | `String`       | Project name (max 100 chars) |
| `goal`      | `String`       | Project goal / objective (max 500 chars), nullable |
| `status`    | `Integer`      | **0 = Active (in progress), 1 = Archived** |
| `progress`  | `BigDecimal`   | Completion percentage, 0.00–100.00 (defaults to 0.00) |
| `orderNo`   | `Integer`      | Sort priority — smaller numbers appear first; unique per user |
| `startDate` | `LocalDate`    | Planned start date, nullable |
| `endDate`   | `LocalDate`    | Planned end date, nullable |
| `isDelete`  | `Integer`      | Logical delete flag — `0` = normal, `1` = deleted |
| `deletedAt` | `LocalDateTime`| Timestamp when the project was soft-deleted, nullable |
| `createTime`| `LocalDateTime`| Record creation timestamp |
| `updateTime`| `LocalDateTime`| Last update timestamp |

### Milestone Entity

| Field         | Type           | Description |
|---------------|----------------|-------------|
| `id`          | `Long`         | Unique primary key |
| `projectId`   | `Long`         | Parent project ID |
| `userId`      | `Long`         | Owner user ID |
| `name`        | `String`       | Milestone name (max 100 chars) |
| `orderNo`     | `Integer`      | Sort priority within the project — smaller = higher position; unique per project |
| `progress`    | `BigDecimal`   | Completion percentage, 0.00–100.00 (defaults to 0.00) |
| `deleteSource`| `Integer`      | Who initiated deletion: **0 = none (normal), 1 = manual delete, 2 = cascade (parent project deleted)** |
| `isDelete`    | `Integer`      | Logical delete flag — `0` = normal, `1` = deleted |
| `deletedAt`   | `LocalDateTime`| Timestamp when the milestone was soft-deleted, nullable |
| `createTime`  | `LocalDateTime`| Record creation timestamp |
| `updateTime`  | `LocalDateTime`| Last update timestamp |

### Task Entity

| Field         | Type           | Description |
|---------------|----------------|-------------|
| `id`          | `Long`         | Unique primary key |
| `projectId`   | `Long`         | Parent project ID |
| `milestoneId` | `Long`         | Parent milestone ID, nullable (task may be ungrouped) |
| `userId`      | `Long`         | Assigned user ID |
| `title`       | `String`       | Task title (max 60 chars) |
| `description` | `String`       | Task description (max 550 chars), nullable |
| `status`      | `Integer`      | **0 = To Do, 1 = In Progress, 2 = Completed** |
| `priority`    | `Integer`      | Priority level — higher value = higher priority; defaults to `0` |
| `dueDate`     | `LocalDate`    | Deadline, nullable |
| `completedAt` | `LocalDateTime`| Timestamp when the task was marked completed, nullable |
| `deleteSource`| `Integer`      | Who initiated deletion: **0 = none (normal), 1 = manual delete, 2 = cascade (parent deleted)** |
| `isDelete`    | `Integer`      | Logical delete flag — `0` = normal, `1` = deleted |
| `deletedAt`   | `LocalDateTime`| Timestamp when the task was soft-deleted, nullable |
| `createTime`  | `LocalDateTime`| Record creation timestamp |
| `updateTime`  | `LocalDateTime`| Last update timestamp |

### deleteSource Field — What It Means

Tracks who triggered the soft-delete, used primarily for cascade deletion scenarios:

| Value | Meaning |
|-------|---------|
| `0`   | Not deleted, or deleted by an unknown party |
| `1`   | Deleted manually by a user action |
| `2`   | Cascade deletion — deleted automatically when the parent (project or milestone) was deleted |

### Status Field Values

**Project status:**

| Value | Meaning |
|-------|---------|
| `0`   | Active / In Progress |
| `1`   | Archived |

**Task status:**

| Value | Meaning |
|-------|---------|
| `0`   | To Do |
| `1`   | In Progress |
| `2`   | Completed |

---

## Project Controller

### `POST /project/add` — Create Project

Creates a new project and returns its generated ID.

**Request Body — `ProjectCreateRequest`**

| Field       | Type         | Required | Description |
|-------------|--------------|----------|-------------|
| `name`      | `String`     | Yes      | Project name (max 100 chars) |
| `goal`      | `String`     | No       | Project goal / objective |
| `startDate` | `LocalDate`  | No       | Start date, format `yyyy-MM-dd` |
| `endDate`   | `LocalDate`  | No       | End date, format `yyyy-MM-dd` |

**Response** — `BaseResponse<Long>`

```json
{
  "code": 0,
  "message": "OK",
  "data": 1901234567890123456
}
```

---

### `GET /project/get/{id}` — Get Project by ID

Retrieves a single project by its ID. Returns `ProjectVo`.

**Path Parameters**

| Param | Type   | Description |
|-------|--------|-------------|
| `id`  | `Long` | Project ID |

**Response** — `BaseResponse<ProjectVo>`

```json
{
  "code": 0,
  "message": "OK",
  "data": {
    "id": 1901234567890123456,
    "userId": 1001,
    "name": "Q1 Learning Plan",
    "goal": "Master Spring Boot by Q1",
    "status": 0,
    "orderNo": 0,
    "startDate": "2026-01-01",
    "endDate": "2026-03-31",
    "createTime": "2026-01-01T09:00:00",
    "updateTime": "2026-01-15T14:30:00"
  }
}
```

---

### `GET /project/list` — List Projects (Paginated)

Returns a paginated list of projects with optional status and keyword filters.

**Query Parameters**

| Param     | Type      | Default | Description |
|-----------|-----------|---------|-------------|
| `pageNum` | `Long`    | `1`     | Page number |
| `pageSize`| `Long`    | `1000`  | Page size |
| `status`  | `Integer` | No      | Filter by status: `0` = active, `1` = archived |
| `keyword` | `String`  | No      | Fuzzy search on project name |

**Response** — `BaseResponse<Page<ProjectVo>>`

```json
{
  "code": 0,
  "message": "OK",
  "data": {
    "total": 42,
    "size": 10,
    "current": 1,
    "records": [
      {
        "id": 1901234567890123456,
        "userId": 1001,
        "name": "Q1 Learning Plan",
        "goal": "Master Spring Boot by Q1",
        "status": 0,
        "orderNo": 0,
        "startDate": "2026-01-01",
        "endDate": "2026-03-31",
        "createTime": "2026-01-01T09:00:00",
        "updateTime": "2026-01-15T14:30:00"
      }
    ]
  }
}
```

---

### `POST /project/update` — Update Project

Updates mutable fields of an existing project.

**Request Body — `ProjectUpdateRequest`**

| Field       | Type         | Required | Description |
|-------------|--------------|----------|-------------|
| `id`        | `Long`       | Yes      | Project ID |
| `name`      | `String`     | No       | New project name |
| `goal`      | `String`     | No       | New goal text |
| `status`    | `Integer`    | No       | New status (`0` active, `1` archived) |
| `startDate` | `LocalDate`  | No       | New start date, format `yyyy-MM-dd` |
| `endDate`   | `LocalDate`  | No       | New end date, format `yyyy-MM-dd` |

**Response** — `BaseResponse<Boolean>`

```json
{
  "code": 0,
  "message": "OK",
  "data": true
}
```

---

### `POST /project/reorder` — Reorder Projects

Batch-update the sort order of multiple projects. Pass the full desired ordering; items not included may be affected depending on implementation.

**Request Body** — `List<ProjectReorderRequest>`

```json
[
  { "id": 1901234567890123456, "orderNo": 0 },
  { "id": 1901234567890123457, "orderNo": 1 },
  { "id": 1901234567890123458, "orderNo": 2 }
]
```

**`ProjectReorderRequest`**

| Field     | Type      | Description |
|-----------|-----------|-------------|
| `id`      | `Long`    | Project ID |
| `orderNo` | `Integer` | New sort position (smaller = higher priority) |

**Response** — `BaseResponse<Boolean>`

```json
{
  "code": 0,
  "message": "OK",
  "data": true
}
```

---

### `POST /project/archive` — Archive Projects

Archives one or more projects (sets `status = 1`). Archived projects are not returned in normal list queries by default.

**Request Body** — `List<Long>`

```json
[1901234567890123456, 1901234567890123457]
```

**Response** — `BaseResponse<Boolean>`

```json
{
  "code": 0,
  "message": "OK",
  "data": true
}
```

---

### `POST /project/delete/{id}` — Delete Project (Soft Delete)

Soft-deletes a project (sets `isDelete = 1`, records `deletedAt`). This may cascade-delete associated milestones and tasks depending on service-layer logic.

**Path Parameters**

| Param | Type   | Description |
|-------|--------|-------------|
| `id`  | `Long` | Project ID |

**Response** — `BaseResponse<Boolean>`

```json
{
  "code": 0,
  "message": "OK",
  "data": true
}
```

---

### `POST /project/recover/{id}` — Recover Project

Restores a soft-deleted project (sets `isDelete = 0`). The project must not already exist as an active record.

**Path Parameters**

| Param | Type   | Description |
|-------|--------|-------------|
| `id`  | `Long` | Project ID |

**Response** — `BaseResponse<Boolean>`

```json
{
  "code": 0,
  "message": "OK",
  "data": true
}
```

---

## Milestone Controller

### `POST /milestone/add` — Create Milestone

Creates a new milestone within a project and returns its generated ID.

**Request Body — `MilestoneCreateRequest`**

| Field      | Type   | Required | Description |
|------------|--------|----------|-------------|
| `projectId`| `Long` | Yes      | Parent project ID |
| `name`     | `String`| Yes     | Milestone name (max 100 chars) |

**Response** — `BaseResponse<Long>`

```json
{
  "code": 0,
  "message": "OK",
  "data": 2901234567890123456
}
```

---

### `GET /milestone/list` — List Milestones

Returns all milestones for a given project, optionally filtered by keyword. Results are sorted by `orderNo` ascending.

**Query Parameters**

| Param      | Type    | Required | Description |
|------------|---------|----------|-------------|
| `projectId`| `Long`  | Yes      | Parent project ID |
| `keyword`  | `String`| No       | Fuzzy search on milestone name |

**Response** — `BaseResponse<List<MilestoneVo>>`

```json
{
  "code": 0,
  "message": "OK",
  "data": [
    {
      "id": 2901234567890123456,
      "projectId": 1901234567890123456,
      "userId": 1001,
      "name": "Phase 1: Foundation",
      "orderNo": 0,
      "progress": 60.00,
      "createTime": "2026-01-01T09:00:00",
      "updateTime": "2026-02-01T11:20:00"
    }
  ]
}
```

---

### `POST /milestone/update` — Update Milestone

Updates mutable fields of an existing milestone.

**Request Body — `MilestoneUpdateRequest`**

| Field      | Type         | Required | Description |
|------------|--------------|----------|-------------|
| `id`       | `Long`       | Yes      | Milestone ID |
| `name`     | `String`     | No       | New milestone name |
| `orderNo`  | `Integer`    | No       | New sort position within the project |
| `progress` | `BigDecimal` | No       | Progress percentage, 0.00–100.00 |

**Response** — `BaseResponse<Boolean>`

```json
{
  "code": 0,
  "message": "OK",
  "data": true
}
```

---

### `POST /milestone/delete/{id}` — Delete Milestone (Soft Delete)

Soft-deletes a milestone. Associated tasks may be cascade-deleted depending on service-layer logic.

**Path Parameters**

| Param | Type   | Description |
|-------|--------|-------------|
| `id`  | `Long` | Milestone ID |

**Response** — `BaseResponse<Boolean>`

```json
{
  "code": 0,
  "message": "OK",
  "data": true
}
```

---

## Task Controller

### `POST /task/add` — Create Task

Creates a new task and returns its generated ID.

**Request Body — `TaskCreateRequest`**

| Field        | Type         | Required | Description |
|--------------|--------------|----------|-------------|
| `title`      | `String`     | Yes      | Task title (max 60 chars) |
| `description`| `String`     | No       | Task description (max 550 chars) |
| `projectId`  | `Long`       | Yes      | Parent project ID |
| `milestoneId`| `Long`       | No       | Parent milestone ID (nullable) |
| `priority`   | `Integer`    | No       | Priority level, defaults to `0` |
| `dueDate`    | `LocalDate`  | No       | Deadline, format `yyyy-MM-dd` |

**Response** — `BaseResponse<Long>`

```json
{
  "code": 0,
  "message": "OK",
  "data": 3901234567890123456
}
```

---

### `GET /task/get/{id}` — Get Task by ID

Retrieves a single task by its ID. Returns `TaskVo`.

**Path Parameters**

| Param | Type   | Description |
|-------|--------|-------------|
| `id`  | `Long` | Task ID |

**Response** — `BaseResponse<TaskVo>`

```json
{
  "code": 0,
  "message": "OK",
  "data": {
    "id": 3901234567890123456,
    "projectId": 1901234567890123456,
    "milestoneId": 2901234567890123456,
    "userId": 1001,
    "title": "Read Spring Security docs",
    "description": "Covers authentication and authorization basics",
    "status": 1,
    "priority": 2,
    "dueDate": "2026-04-20",
    "completedAt": null,
    "createTime": "2026-04-01T10:00:00",
    "updateTime": "2026-04-10T15:30:00"
  }
}
```

---

### `GET /task/list` — List Tasks (Paginated)

Returns a paginated list of tasks with optional filters.

**Query Parameters**

| Param       | Type      | Default | Description |
|-------------|-----------|---------|-------------|
| `projectId` | `Long`    | No      | Filter by parent project |
| `status`    | `Integer` | No      | Filter by status: `0` to do, `1` in progress, `2` completed |
| `isOverdue` | `Boolean` | No      | If `true`, return only overdue tasks (dueDate in the past and status not `2`) |
| `current`   | `Integer` | `1`     | Page number (1-indexed) |
| `size`      | `Integer` | `10`    | Page size |

**Response** — `BaseResponse<Page<TaskVo>>`

```json
{
  "code": 0,
  "message": "OK",
  "data": {
    "total": 87,
    "size": 10,
    "current": 1,
    "records": [
      {
        "id": 3901234567890123456,
        "projectId": 1901234567890123456,
        "milestoneId": 2901234567890123456,
        "userId": 1001,
        "title": "Read Spring Security docs",
        "description": "Covers authentication and authorization basics",
        "status": 1,
        "priority": 2,
        "dueDate": "2026-04-20",
        "completedAt": null,
        "createTime": "2026-04-01T10:00:00",
        "updateTime": "2026-04-10T15:30:00"
      }
    ]
  }
}
```

---

### `POST /task/update` — Update Task

Updates mutable fields of an existing task. Setting `status = 2` may auto-populate `completedAt`.

**Request Body — `TaskUpdateRequest`**

| Field        | Type         | Required | Description |
|--------------|--------------|----------|-------------|
| `id`         | `Long`       | Yes      | Task ID |
| `title`      | `String`     | No       | New task title |
| `description`| `String`     | No       | New description |
| `status`     | `Integer`    | No       | New status: `0` to do, `1` in progress, `2` completed |
| `priority`   | `Integer`    | No       | New priority level |
| `dueDate`    | `LocalDate`  | No       | New deadline, format `yyyy-MM-dd` |
| `milestoneId`| `Long`       | No       | New parent milestone ID (nullable to ungroup) |

**Response** — `BaseResponse<Boolean>`

```json
{
  "code": 0,
  "message": "OK",
  "data": true
}
```

---

### `POST /task/delete/{id}` — Delete Task (Soft Delete)

Soft-deletes a task (moves it to trash/recycle bin). The task is not permanently removed.

**Path Parameters**

| Param | Type   | Description |
|-------|--------|-------------|
| `id`  | `Long` | Task ID |

**Response** — `BaseResponse<Boolean>`

```json
{
  "code": 0,
  "message": "OK",
  "data": true
}
```

---

## Relationship Summary

```
Project  (1) ──────< (many) Milestone
  │                          │
  └─────< (many) Task  <─────┘
```

- A **Project** contains multiple **Milestones** and **Tasks**.
- A **Milestone** optionally contains multiple **Tasks**.
- A **Task** belongs to one **Milestone** (nullable) and one **Project**.
- Deleting a project or milestone may cascade-delete associated children (`deleteSource = 2`).
