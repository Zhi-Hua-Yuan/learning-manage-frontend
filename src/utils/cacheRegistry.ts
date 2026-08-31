export interface CacheEntry {
  key: string
  ttlMs: number | null
  version: number
  owner: string
}

export const TASK_LIST_CACHE_PREFIX = 'tick:cache:task-list:v1'
export const TASK_LIST_ALL_CACHE_KEY = 'tick:cache:task-list:all:v1'
export const PROJECT_LIST_CACHE_PREFIX = 'tick:cache:project-list'
export const PROJECT_PROGRESS_CACHE_KEY = 'tick:cache:project-progress:v2'
export const TASK_TODAY_AI_ORDER_CACHE_KEY = 'tick:cache:task-today-ai-order:v1'
export const TASK_LIST_REPLAN_STATE_CACHE_KEY = 'tick:cache:task-list-replan-state:v1'

export const CACHE_REGISTRY = {
  selectedProjectId: {
    key: 'tick_selectedProjectId',
    ttlMs: null,
    version: 1,
    owner: 'task-board-selection',
  },
  themeMode: {
    key: 'tick_themeMode',
    ttlMs: null,
    version: 1,
    owner: 'theme',
  },
  aiPlannerDraft: {
    key: 'tick_aiPlannerDraft_v1',
    ttlMs: null,
    version: 1,
    owner: 'ai-planner',
  },
  projectProgress: {
    key: PROJECT_PROGRESS_CACHE_KEY,
    ttlMs: 30 * 60 * 1000,
    version: 1,
    owner: 'project-progress',
  },
  taskTodayAiOrder: {
    key: TASK_TODAY_AI_ORDER_CACHE_KEY,
    ttlMs: null,
    version: 1,
    owner: 'task-today-ai-order',
  },
  taskListReplanState: {
    key: TASK_LIST_REPLAN_STATE_CACHE_KEY,
    ttlMs: null,
    version: 1,
    owner: 'task-list-replan',
  },
} as const satisfies Record<string, CacheEntry>

export const getTaskListCacheEntry = (projectId: string): CacheEntry => ({
  key: `${TASK_LIST_CACHE_PREFIX}:${projectId}`,
  ttlMs: 5 * 60 * 1000,
  version: 2,
  owner: 'task-list',
})

export const getTaskListAllCacheEntry = (): CacheEntry => ({
  key: TASK_LIST_ALL_CACHE_KEY,
  ttlMs: 5 * 60 * 1000,
  version: 2,
  owner: 'task-list-aggregate',
})

export const getProjectListCacheEntry = (status: 0 | 1): CacheEntry => ({
  key: `${PROJECT_LIST_CACHE_PREFIX}:status-${status}:v1`,
  ttlMs: 5 * 60 * 1000,
  version: 1,
  owner: 'project-list',
})

export const AUTH_TOKEN_POLICY = {
  key: 'token',
  owner: 'auth',
  storage: 'localStorage',
  format: 'plain-token',
  note: 'Token is managed only by authToken utils and request/router auth flow.',
} as const
