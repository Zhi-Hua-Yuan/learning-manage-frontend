import { getActiveCacheActor, normalizeCacheActorId, scopeCacheKey } from '@/utils/cacheActor'

interface CacheEntryBase {
  key: string
  ttlMs: number | null
  version: number
  owner: string
}

export interface GlobalCacheEntry extends CacheEntryBase {
  scope: 'GLOBAL_PREFERENCE' | 'INFRASTRUCTURE'
}

export interface ActorCacheTemplate extends CacheEntryBase {
  scope: 'ACTOR_TEMPLATE'
}

export interface ActorScopedCacheEntry extends CacheEntryBase {
  scope: 'ACTOR_SCOPED'
  actorId: string
}

export type CacheEntry = GlobalCacheEntry | ActorCacheTemplate | ActorScopedCacheEntry
export type ResolvedCacheEntry = GlobalCacheEntry | ActorScopedCacheEntry

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
    scope: 'ACTOR_TEMPLATE',
  },
  themeMode: {
    key: 'tick_themeMode',
    ttlMs: null,
    version: 1,
    owner: 'theme',
    scope: 'GLOBAL_PREFERENCE',
  },
  aiPlannerDraft: {
    key: 'tick_aiPlannerDraft_v1',
    ttlMs: null,
    version: 1,
    owner: 'ai-planner',
    scope: 'ACTOR_TEMPLATE',
  },
  projectProgress: {
    key: PROJECT_PROGRESS_CACHE_KEY,
    ttlMs: 30 * 60 * 1000,
    version: 1,
    owner: 'project-progress',
    scope: 'ACTOR_TEMPLATE',
  },
  taskTodayAiOrder: {
    key: TASK_TODAY_AI_ORDER_CACHE_KEY,
    ttlMs: null,
    version: 1,
    owner: 'task-today-ai-order',
    scope: 'ACTOR_TEMPLATE',
  },
  taskListReplanState: {
    key: TASK_LIST_REPLAN_STATE_CACHE_KEY,
    ttlMs: null,
    version: 1,
    owner: 'task-list-replan',
    scope: 'ACTOR_TEMPLATE',
  },
} as const satisfies Record<string, CacheEntry>

export const getTaskListCacheEntry = (projectId: string): ActorCacheTemplate => ({
  key: `${TASK_LIST_CACHE_PREFIX}:${projectId}`,
  ttlMs: 5 * 60 * 1000,
  version: 2,
  owner: 'task-list',
  scope: 'ACTOR_TEMPLATE',
})

export const getActorScopedCacheEntry = (
  entry: ActorCacheTemplate,
  actorId: unknown = getActiveCacheActor(),
): ActorScopedCacheEntry | null => {
  const key = scopeCacheKey(entry.key, actorId)
  const normalizedActorId = normalizeCacheActorId(actorId)
  return key && normalizedActorId
    ? { ...entry, key, scope: 'ACTOR_SCOPED', actorId: normalizedActorId }
    : null
}

export const getActorTaskListCacheEntry = (projectId: string, actorId?: unknown): ActorScopedCacheEntry | null =>
  getActorScopedCacheEntry(getTaskListCacheEntry(projectId), actorId)

export const getActorTaskListAllCacheEntry = (actorId?: unknown): ActorScopedCacheEntry | null =>
  getActorScopedCacheEntry(getTaskListAllCacheEntry(), actorId)

export const getActorProjectListCacheEntry = (status: 0 | 1, actorId?: unknown): ActorScopedCacheEntry | null =>
  getActorScopedCacheEntry(getProjectListCacheEntry(status), actorId)

export const getActorProjectProgressCacheEntry = (actorId?: unknown): ActorScopedCacheEntry | null =>
  getActorScopedCacheEntry(CACHE_REGISTRY.projectProgress, actorId)

export const getActorAiPlannerDraftCacheEntry = (actorId?: unknown): ActorScopedCacheEntry | null =>
  getActorScopedCacheEntry(CACHE_REGISTRY.aiPlannerDraft, actorId)

export const getActorTaskTodayAiOrderCacheEntry = (actorId?: unknown): ActorScopedCacheEntry | null =>
  getActorScopedCacheEntry(CACHE_REGISTRY.taskTodayAiOrder, actorId)

export const getActorTaskListReplanStateCacheEntry = (actorId?: unknown): ActorScopedCacheEntry | null =>
  getActorScopedCacheEntry(CACHE_REGISTRY.taskListReplanState, actorId)

export const getTaskListAllCacheEntry = (): ActorCacheTemplate => ({
  key: TASK_LIST_ALL_CACHE_KEY,
  ttlMs: 5 * 60 * 1000,
  version: 2,
  owner: 'task-list-aggregate',
  scope: 'ACTOR_TEMPLATE',
})

export const getProjectListCacheEntry = (status: 0 | 1): ActorCacheTemplate => ({
  key: `${PROJECT_LIST_CACHE_PREFIX}:status-${status}:v1`,
  ttlMs: 5 * 60 * 1000,
  version: 1,
  owner: 'project-list',
  scope: 'ACTOR_TEMPLATE',
})

export const AUTH_TOKEN_POLICY = {
  key: 'token',
  owner: 'auth',
  storage: 'localStorage',
  format: 'plain-token',
  note: 'Token is managed only by authToken utils and request/router auth flow.',
} as const
