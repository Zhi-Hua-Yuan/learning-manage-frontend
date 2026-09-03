import { listStorageKeys, removeRawStorage } from '@/utils/cacheClient'

const LEGACY_EXACT_KEYS = new Set([
  'tick_selectedProjectId',
  'tick:cache:project-progress:v2',
  'tick:cache:task-list:all:v1',
  'tick_aiPlannerDraft_v1',
  'tick:cache:task-today-ai-order:v1',
  'tick:cache:task-list-replan-state:v1',
])

const LEGACY_DYNAMIC_KEY_PATTERNS = [
  /^tick:cache:project-list:status-[01]:v1$/,
  /^tick:cache:task-list:v1:[^:]+$/,
]

export const isLegacyUnscopedBusinessCacheKey = (key: string) => (
  LEGACY_EXACT_KEYS.has(key) || LEGACY_DYNAMIC_KEY_PATTERNS.some((pattern) => pattern.test(key))
)

export const dropLegacyUnscopedBusinessCaches = () => {
  listStorageKeys()
    .filter(isLegacyUnscopedBusinessCacheKey)
    .forEach(removeRawStorage)
}
