import {
  clearActiveSessionActor,
  clearAuthCredential,
  clearProtectedSessionStorage,
  type ProtectedStorageCleanupResult,
} from '@/utils/sessionStorageCleanup'

export type SessionResetReason =
  | 'USER_LOGOUT'
  | 'AUTHENTICATION_REQUIRED'
  | 'PASSWORD_CHANGED'
  | 'TOKEN_REPLACED'
  | 'ACTOR_CHANGED'

export interface SessionResetResult extends ProtectedStorageCleanupResult {
  changed: boolean
  resetHandlerErrors: number
}

type SessionResetHandler = (reason: SessionResetReason) => void

const resetHandlers = new Set<SessionResetHandler>()

export const registerSessionResetHandler = (handler: SessionResetHandler) => {
  resetHandlers.add(handler)
  return () => resetHandlers.delete(handler)
}

export const resetProtectedSessionState = (reason: SessionResetReason): SessionResetResult => {
  const storage = clearProtectedSessionStorage()
  let resetHandlerErrors = 0

  resetHandlers.forEach((handler) => {
    try {
      handler(reason)
    } catch {
      resetHandlerErrors += 1
    }
  })

  clearActiveSessionActor()

  return {
    changed: storage.localStorageKeys > 0 || storage.sessionStorageKeys > 0 || resetHandlers.size > 0,
    ...storage,
    resetHandlerErrors,
  }
}

export const terminateAuthenticatedSession = (reason: SessionResetReason): SessionResetResult => {
  const result = resetProtectedSessionState(reason)
  clearAuthCredential()
  return result
}
