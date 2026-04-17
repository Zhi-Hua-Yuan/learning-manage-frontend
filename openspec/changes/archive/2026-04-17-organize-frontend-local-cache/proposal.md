## Why

当前前端本地缓存并非完全零散，但也没有统一入口：任务与项目列表缓存在 `src/utils/taskCache.ts`、`src/utils/projectCache.ts` 有封装，而主题、布局偏好、AI 草稿、鉴权 token 仍分散在多个页面/组合函数直接读写 `localStorage`。这导致缓存键命名、TTL、失效策略与跨看板一致性维护成本变高，已经出现“清单更新后 Today/本周视图未同步”的实际问题。

## What Changes

- 建立统一的本地缓存治理层（注册表 + 访问封装），收敛缓存键定义、TTL、序列化与版本管理规则。
- 为业务缓存（任务、项目）补齐一致性同步策略，明确单项目缓存与聚合缓存的写入规则与触发点。
- 为 UI 偏好与草稿类缓存提供统一访问接口，逐步替代组件内直接 `localStorage` 读写。
- 增加缓存可观测与调试能力（命中来源、失效原因、版本迁移日志）。

## Capabilities

### New Capabilities
- `local-cache-governance`: 提供统一缓存注册、读写、TTL/版本与失效规则，避免缓存策略散落在各处。
- `task-cache-consistency`: 保证任务在清单视图与 Today/本周聚合视图之间的缓存一致性与可预测刷新行为。

### Modified Capabilities
- None.

## Impact

- Affected code:
  - `src/utils/taskCache.ts`
  - `src/utils/projectCache.ts`
  - `src/views/task/TaskList.vue`
  - `src/layout/BasicLayout.vue`
  - `src/views/ai/AiPlanner.vue`
  - `src/composables/useTheme.ts`
  - `src/router/index.ts`
  - `src/views/LoginView.vue`
  - `src/utils/request.ts`
- API impact: none（仅前端本地缓存组织调整）。
- Dependencies: no new dependency planned.
