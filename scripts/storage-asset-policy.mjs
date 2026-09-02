export const STORAGE_SCOPES = Object.freeze([
  'AUTH_CREDENTIAL',
  'GLOBAL_PREFERENCE',
  'ACTOR_RESOURCE',
  'ACTOR_DRAFT',
  'SESSION_OPERATION',
  'INFRASTRUCTURE',
  'MEMORY_ONLY',
])

export const STORAGE_SENSITIVITY = Object.freeze([
  'LOW',
  'INTERNAL',
  'SENSITIVE',
  'SECRET',
])

export const LEGACY_ACTIONS = Object.freeze(['KEEP', 'DROP', 'MIGRATE', 'NOT_APPLICABLE'])
export const IMPLEMENTATION_TARGETS = Object.freeze(['KEEP', 'E1-2', 'E1-3', 'E2', 'E3'])

/**
 * E1-1.2 classification baseline. This is a policy manifest only; runtime
 * cache key changes and lifecycle wiring are intentionally deferred.
 */
export const storageAssetPolicy = Object.freeze([
  {
    id: 'S7-CACHE-001', name: 'auth token', currentStorage: 'localStorage', currentKey: 'token',
    source: 'src/utils/authToken.ts', targetScope: 'AUTH_CREDENTIAL', sensitivity: 'SECRET',
    persistenceAllowed: true, actorRequired: false, clearOnSessionEnd: true,
    clearOnBackendVersionChange: false, legacyAction: 'KEEP', implementationTarget: 'E2',
    rationale: '认证凭据由身份生命周期单独管理。',
  },
  {
    id: 'S7-CACHE-002', name: 'theme mode', currentStorage: 'localStorage', currentKey: 'tick_themeMode',
    source: 'src/utils/appCache.ts', targetScope: 'GLOBAL_PREFERENCE', sensitivity: 'LOW',
    persistenceAllowed: true, actorRequired: false, clearOnSessionEnd: false,
    clearOnBackendVersionChange: false, legacyAction: 'KEEP', implementationTarget: 'KEEP',
    rationale: '主题是本机 UI 偏好，与账号无关。',
  },
  {
    id: 'S7-CACHE-003', name: 'sidebar width', currentStorage: 'localStorage', currentKey: 'tick_sidebarWidth',
    source: 'src/layout/BasicLayout.vue', targetScope: 'GLOBAL_PREFERENCE', sensitivity: 'LOW',
    persistenceAllowed: true, actorRequired: false, clearOnSessionEnd: false,
    clearOnBackendVersionChange: false, legacyAction: 'KEEP', implementationTarget: 'KEEP',
    rationale: '侧栏宽度是本机 UI 偏好。',
  },
  {
    id: 'S7-CACHE-004', name: 'task detail width', currentStorage: 'localStorage', currentKey: 'tick_detailWidth',
    source: 'src/views/task/TaskList.vue', targetScope: 'GLOBAL_PREFERENCE', sensitivity: 'LOW',
    persistenceAllowed: true, actorRequired: false, clearOnSessionEnd: false,
    clearOnBackendVersionChange: false, legacyAction: 'KEEP', implementationTarget: 'KEEP',
    rationale: '任务详情宽度是本机 UI 偏好。',
  },
  {
    id: 'S7-CACHE-005', name: 'selected project', currentStorage: 'localStorage', currentKey: 'tick_selectedProjectId',
    source: 'src/utils/appCache.ts', targetScope: 'ACTOR_RESOURCE', sensitivity: 'INTERNAL',
    persistenceAllowed: true, actorRequired: true, clearOnSessionEnd: true,
    clearOnBackendVersionChange: true, legacyAction: 'DROP', implementationTarget: 'E1-2',
    rationale: '项目引用不能跨账号恢复。',
  },
  {
    id: 'S7-CACHE-006', name: 'project list', currentStorage: 'localStorage', currentKey: 'tick:cache:project-list:status-{status}:v1',
    source: 'src/utils/projectCache.ts', targetScope: 'ACTOR_RESOURCE', sensitivity: 'SENSITIVE',
    persistenceAllowed: true, actorRequired: true, clearOnSessionEnd: true,
    clearOnBackendVersionChange: true, legacyAction: 'DROP', implementationTarget: 'E1-2',
    rationale: '项目列表属于当前账号资源。',
  },
  {
    id: 'S7-CACHE-007', name: 'project progress', currentStorage: 'localStorage', currentKey: 'tick:cache:project-progress:v2',
    source: 'src/utils/projectCache.ts', targetScope: 'ACTOR_RESOURCE', sensitivity: 'SENSITIVE',
    persistenceAllowed: true, actorRequired: true, clearOnSessionEnd: true,
    clearOnBackendVersionChange: true, legacyAction: 'DROP', implementationTarget: 'E1-2',
    rationale: '进度 map 由当前账号的项目事实组成。',
  },
  {
    id: 'S7-CACHE-008', name: 'project task list', currentStorage: 'localStorage', currentKey: 'tick:cache:task-list:v1:{projectId}',
    source: 'src/utils/taskCache.ts', targetScope: 'ACTOR_RESOURCE', sensitivity: 'SENSITIVE',
    persistenceAllowed: true, actorRequired: true, clearOnSessionEnd: true,
    clearOnBackendVersionChange: true, legacyAction: 'DROP', implementationTarget: 'E1-2',
    rationale: '任务事实必须同时绑定账号和项目。',
  },
  {
    id: 'S7-CACHE-009', name: 'aggregate task list', currentStorage: 'localStorage', currentKey: 'tick:cache:task-list:all:v1',
    source: 'src/utils/taskCache.ts', targetScope: 'ACTOR_RESOURCE', sensitivity: 'SENSITIVE',
    persistenceAllowed: true, actorRequired: true, clearOnSessionEnd: true,
    clearOnBackendVersionChange: true, legacyAction: 'DROP', implementationTarget: 'E1-2',
    rationale: '全项目聚合任务不能使用全局共享 key。',
  },
  {
    id: 'S7-CACHE-010', name: 'AI planner draft', currentStorage: 'localStorage', currentKey: 'tick_aiPlannerDraft_v1',
    source: 'src/utils/appCache.ts', targetScope: 'ACTOR_DRAFT', sensitivity: 'SENSITIVE',
    persistenceAllowed: true, actorRequired: true, clearOnSessionEnd: true,
    clearOnBackendVersionChange: false, legacyAction: 'DROP', implementationTarget: 'E1-2',
    rationale: '草稿含用户输入，不能作为全局草稿读取。',
  },
  {
    id: 'S7-CACHE-011', name: 'today AI order', currentStorage: 'localStorage', currentKey: 'tick:cache:task-today-ai-order:v1',
    source: 'src/utils/appCache.ts', targetScope: 'ACTOR_DRAFT', sensitivity: 'SENSITIVE',
    persistenceAllowed: true, actorRequired: true, clearOnSessionEnd: true,
    clearOnBackendVersionChange: true, legacyAction: 'DROP', implementationTarget: 'E1-2',
    rationale: '排序状态含当前账号的任务上下文。',
  },
  {
    id: 'S7-CACHE-012', name: 'list replan state', currentStorage: 'localStorage', currentKey: 'tick:cache:task-list-replan-state:v1',
    source: 'src/utils/appCache.ts', targetScope: 'ACTOR_DRAFT', sensitivity: 'SENSITIVE',
    persistenceAllowed: true, actorRequired: true, clearOnSessionEnd: true,
    clearOnBackendVersionChange: true, legacyAction: 'DROP', implementationTarget: 'E1-2',
    rationale: '重排状态含项目和任务上下文。',
  },
  {
    id: 'S7-CACHE-013', name: 'backend cache version', currentStorage: 'localStorage', currentKey: 'tick_backend_cache_version',
    source: 'src/utils/cacheVersion.ts', targetScope: 'INFRASTRUCTURE', sensitivity: 'INTERNAL',
    persistenceAllowed: true, actorRequired: false, clearOnSessionEnd: false,
    clearOnBackendVersionChange: false, legacyAction: 'KEEP', implementationTarget: 'E1-3',
    rationale: '版本标记是缓存基础设施元数据。',
  },
  {
    id: 'S7-CACHE-014', name: 'backend cache reload lock', currentStorage: 'sessionStorage', currentKey: 'tick_backend_cache_reload_lock',
    source: 'src/utils/cacheVersion.ts', targetScope: 'INFRASTRUCTURE', sensitivity: 'INTERNAL',
    persistenceAllowed: true, actorRequired: false, clearOnSessionEnd: false,
    clearOnBackendVersionChange: false, legacyAction: 'KEEP', implementationTarget: 'KEEP',
    rationale: 'reload 防抖锁是基础设施元数据。',
  },
  {
    id: 'S7-CACHE-015', name: 'AI confirm operation', currentStorage: 'sessionStorage', currentKey: 'ai:draft:confirm-operation:{draftId}',
    source: 'src/views/ai/AiDraftDetail.vue', targetScope: 'SESSION_OPERATION', sensitivity: 'SENSITIVE',
    persistenceAllowed: true, actorRequired: true, clearOnSessionEnd: true,
    clearOnBackendVersionChange: false, legacyAction: 'DROP', implementationTarget: 'E2',
    rationale: '幂等 operationId 绑定草稿业务上下文，不能跨账号复用。',
  },
  {
    id: 'S7-MEM-001', name: 'current user', currentStorage: 'memory', currentKey: null,
    source: 'src/stores/collaboration.ts', targetScope: 'MEMORY_ONLY', sensitivity: 'SENSITIVE',
    persistenceAllowed: false, actorRequired: true, clearOnSessionEnd: true,
    clearOnBackendVersionChange: false, legacyAction: 'NOT_APPLICABLE', implementationTarget: 'E2',
    staleGuardRequired: true, resetTarget: 'collaborationStore', rationale: '身份状态只存在当前会话内存。',
  },
  {
    id: 'S7-MEM-002', name: 'teams and roles', currentStorage: 'memory', currentKey: null,
    source: 'src/stores/collaboration.ts', targetScope: 'MEMORY_ONLY', sensitivity: 'SENSITIVE',
    persistenceAllowed: false, actorRequired: true, clearOnSessionEnd: true,
    clearOnBackendVersionChange: false, legacyAction: 'NOT_APPLICABLE', implementationTarget: 'E2',
    staleGuardRequired: true, resetTarget: 'collaborationStore', rationale: '团队和角色权限不能落盘。',
  },
  {
    id: 'S7-MEM-003', name: 'team projects', currentStorage: 'memory', currentKey: null,
    source: 'src/stores/collaboration.ts', targetScope: 'MEMORY_ONLY', sensitivity: 'SENSITIVE',
    persistenceAllowed: false, actorRequired: true, clearOnSessionEnd: true,
    clearOnBackendVersionChange: false, legacyAction: 'NOT_APPLICABLE', implementationTarget: 'E3',
    staleGuardRequired: true, resetTarget: 'collaborationStore', rationale: '按 teamId 缓存于会话内存。',
  },
  {
    id: 'S7-MEM-004', name: 'team members', currentStorage: 'memory', currentKey: null,
    source: 'src/stores/collaboration.ts', targetScope: 'MEMORY_ONLY', sensitivity: 'SENSITIVE',
    persistenceAllowed: false, actorRequired: true, clearOnSessionEnd: true,
    clearOnBackendVersionChange: false, legacyAction: 'NOT_APPLICABLE', implementationTarget: 'E2',
    staleGuardRequired: true, resetTarget: 'collaborationStore', rationale: '成员信息只允许按需加载到内存。',
  },
  {
    id: 'S7-MEM-005', name: 'task capabilities', currentStorage: 'memory', currentKey: null,
    source: 'TaskModel page state', targetScope: 'MEMORY_ONLY', sensitivity: 'SENSITIVE',
    persistenceAllowed: false, actorRequired: true, clearOnSessionEnd: true,
    clearOnBackendVersionChange: false, legacyAction: 'NOT_APPLICABLE', implementationTarget: 'E3',
    staleGuardRequired: true, resetTarget: 'task page state', rationale: 'capability 必须来自当前账号的最新服务端事实。',
  },
  {
    id: 'S7-MEM-006', name: 'assignment history', currentStorage: 'memory', currentKey: null,
    source: 'useTaskAssignmentHistory', targetScope: 'MEMORY_ONLY', sensitivity: 'SENSITIVE',
    persistenceAllowed: false, actorRequired: true, clearOnSessionEnd: true,
    clearOnBackendVersionChange: false, legacyAction: 'NOT_APPLICABLE', implementationTarget: 'E2',
    staleGuardRequired: true, resetTarget: 'history drawer', rationale: '负责人历史不得持久化。',
  },
  {
    id: 'S7-MEM-007', name: 'team shared reviews', currentStorage: 'memory', currentKey: null,
    source: 'useTeamSharedReviews', targetScope: 'MEMORY_ONLY', sensitivity: 'SENSITIVE',
    persistenceAllowed: false, actorRequired: true, clearOnSessionEnd: true,
    clearOnBackendVersionChange: false, legacyAction: 'NOT_APPLICABLE', implementationTarget: 'E2',
    staleGuardRequired: true, resetTarget: 'shared review page', rationale: '共享摘要不得写入未隔离存储。',
  },
  {
    id: 'S7-MEM-008', name: 'private review form', currentStorage: 'memory', currentKey: null,
    source: 'WeeklyReview.vue', targetScope: 'MEMORY_ONLY', sensitivity: 'SENSITIVE',
    persistenceAllowed: false, actorRequired: true, clearOnSessionEnd: true,
    clearOnBackendVersionChange: false, legacyAction: 'NOT_APPLICABLE', implementationTarget: 'E2',
    staleGuardRequired: true, resetTarget: 'review page form', rationale: '私人正文和计划只保存在当前页面。',
  },
  {
    id: 'S7-MEM-009', name: 'AI request metadata', currentStorage: 'memory', currentKey: null,
    source: 'aiPendingRegistry', targetScope: 'MEMORY_ONLY', sensitivity: 'SENSITIVE',
    persistenceAllowed: false, actorRequired: true, clearOnSessionEnd: true,
    clearOnBackendVersionChange: false, legacyAction: 'NOT_APPLICABLE', implementationTarget: 'E2',
    staleGuardRequired: true, resetTarget: 'aiPendingRegistry', rationale: 'requestMeta 可能包含业务 ID。',
  },
  {
    id: 'S7-MEM-010', name: 'AI response payload', currentStorage: 'memory', currentKey: null,
    source: 'aiPendingRegistry', targetScope: 'MEMORY_ONLY', sensitivity: 'SENSITIVE',
    persistenceAllowed: false, actorRequired: true, clearOnSessionEnd: true,
    clearOnBackendVersionChange: false, legacyAction: 'NOT_APPLICABLE', implementationTarget: 'E2',
    staleGuardRequired: true, resetTarget: 'aiPendingRegistry', rationale: 'AI 完整响应不得持久化或写日志。',
  },
  {
    id: 'S7-MEM-011', name: 'assignment selection and reason', currentStorage: 'memory', currentKey: null,
    source: 'Task assignment dialog', targetScope: 'MEMORY_ONLY', sensitivity: 'SENSITIVE',
    persistenceAllowed: false, actorRequired: true, clearOnSessionEnd: true,
    clearOnBackendVersionChange: false, legacyAction: 'NOT_APPLICABLE', implementationTarget: 'E2',
    staleGuardRequired: true, resetTarget: 'assignment dialog', rationale: '成员选择和 reason 不得持久化或写日志。',
  },
])

export const getStorageAssetPolicy = (assetId) =>
  storageAssetPolicy.find((asset) => asset.id === assetId) || null
