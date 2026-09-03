import { getActiveCacheActor } from '@/utils/cacheActor'

export const SESSION_OPERATION_PREFIX = 'ai:draft:confirm-operation:'

const canUseSessionStorage = () => (
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
)

export const getSessionOperationStorageKey = (draftId: string, actorId = getActiveCacheActor()) => {
  const normalizedDraftId = String(draftId || '').trim()
  const normalizedActorId = actorId == null ? '' : String(actorId).trim()
  if (!normalizedDraftId || !normalizedActorId) return null
  return `${SESSION_OPERATION_PREFIX}${normalizedDraftId}:actor-${encodeURIComponent(normalizedActorId)}`
}

export const readSessionOperationId = (draftId: string) => {
  const key = getSessionOperationStorageKey(draftId)
  if (!key || !canUseSessionStorage()) return ''

  try {
    return window.sessionStorage.getItem(key)?.trim() || ''
  } catch {
    return ''
  }
}

export const writeSessionOperationId = (draftId: string, operationId: string) => {
  const key = getSessionOperationStorageKey(draftId)
  if (!key || !canUseSessionStorage()) return false

  try {
    window.sessionStorage.setItem(key, operationId)
    return true
  } catch {
    return false
  }
}
