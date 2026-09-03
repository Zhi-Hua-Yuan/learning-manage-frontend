import { clearAuthToken } from '@/utils/authToken'
import { clearActiveCacheActor } from '@/utils/cacheActor'
import { isLegacyUnscopedBusinessCacheKey } from '@/utils/cacheMigration'
import {
  PROJECT_LIST_CACHE_PREFIX,
  PROJECT_PROGRESS_CACHE_KEY,
  TASK_LIST_ALL_CACHE_KEY,
  TASK_LIST_CACHE_PREFIX,
  TASK_LIST_REPLAN_STATE_CACHE_KEY,
  TASK_TODAY_AI_ORDER_CACHE_KEY,
} from '@/utils/cacheRegistry'
import { listStorageKeys, removeRawStorage } from '@/utils/cacheClient'

const SESSION_OPERATION_PREFIX = 'ai:draft:confirm-operation:'

const canUseSessionStorage = () => (
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
)

const listSessionStorageKeys = () => {
  if (!canUseSessionStorage()) return []

  try {
    const keys: string[] = []
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index)
      if (key) keys.push(key)
    }
    return keys
  } catch {
    return []
  }
}

const removeSessionStorageKey = (key: string) => {
  if (!canUseSessionStorage()) return
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    // Ignore sessionStorage access failures during session cleanup.
  }
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const protectedActorKeyPatterns = [
  new RegExp(`^${escapeRegExp('tick_selectedProjectId')}:actor-.+$`),
  new RegExp(`^${escapeRegExp(PROJECT_LIST_CACHE_PREFIX)}:status-[01]:v1:actor-.+$`),
  new RegExp(`^${escapeRegExp(PROJECT_PROGRESS_CACHE_KEY)}:actor-.+$`),
  new RegExp(`^${escapeRegExp(TASK_LIST_CACHE_PREFIX)}:[^:]+:actor-.+$`),
  new RegExp(`^${escapeRegExp(TASK_LIST_ALL_CACHE_KEY)}:actor-.+$`),
  new RegExp(`^${escapeRegExp(TASK_TODAY_AI_ORDER_CACHE_KEY)}:actor-.+$`),
  new RegExp(`^${escapeRegExp(TASK_LIST_REPLAN_STATE_CACHE_KEY)}:actor-.+$`),
  new RegExp(`^${escapeRegExp('tick_aiPlannerDraft_v1')}:actor-.+$`),
]

export const isProtectedActorStorageKey = (key: string) => (
  protectedActorKeyPatterns.some((pattern) => pattern.test(key))
)

export const isSessionOperationStorageKey = (key: string) => key.startsWith(SESSION_OPERATION_PREFIX)

export interface ProtectedStorageCleanupResult {
  localStorageKeys: number
  sessionStorageKeys: number
}

export const clearProtectedSessionStorage = (): ProtectedStorageCleanupResult => {
  const localKeys = listStorageKeys().filter((key) => (
    isProtectedActorStorageKey(key) || isLegacyUnscopedBusinessCacheKey(key)
  ))
  localKeys.forEach(removeRawStorage)

  const sessionKeys = listSessionStorageKeys().filter(isSessionOperationStorageKey)
  sessionKeys.forEach(removeSessionStorageKey)

  return {
    localStorageKeys: localKeys.length,
    sessionStorageKeys: sessionKeys.length,
  }
}

export const clearAuthCredential = () => {
  clearAuthToken()
}

export const clearActiveSessionActor = () => {
  clearActiveCacheActor()
}
