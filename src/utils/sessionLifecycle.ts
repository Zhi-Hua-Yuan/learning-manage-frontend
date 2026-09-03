import {
  clearActiveSessionActor,
  clearAuthCredential,
  clearProtectedSessionStorage,
  readAuthCredential,
  type ProtectedStorageCleanupResult,
} from '@/utils/sessionStorageCleanup'
import { getActiveCacheActor } from '@/utils/cacheActor'
import { writeAuthToken } from '@/utils/authToken'

export type SessionResetReason =
  | 'USER_LOGOUT'
  | 'AUTHENTICATION_REQUIRED'
  | 'PASSWORD_CHANGED'
  | 'TOKEN_REPLACED'
  | 'ACTOR_CHANGED'

export interface SessionResetResult extends ProtectedStorageCleanupResult {
  changed: boolean
  sessionRevision: number
  resetHandlerErrors: number
}

export interface AuthSessionEstablishResult {
  established: boolean
  replaced: boolean
  sessionRevision: number
}

export interface AuthSessionSnapshot {
  sessionRevision: number
  actorId: string | null
  authenticated: boolean
}

export type AuthenticatedTerminationReason = Exclude<SessionResetReason, 'ACTOR_CHANGED'>

type SessionResetHandler = (reason: SessionResetReason) => void

const resetHandlers = new Set<SessionResetHandler>()
let sessionRevision = 0
let terminatedRevision: number | null = null

export const captureAuthSessionSnapshot = (): AuthSessionSnapshot => ({
  sessionRevision,
  actorId: getActiveCacheActor(),
  authenticated: Boolean(readAuthCredential()),
})

export const isAuthSessionSnapshotActive = (snapshot: AuthSessionSnapshot) => {
  const currentAuthenticated = Boolean(readAuthCredential())
  if (snapshot.authenticated !== currentAuthenticated) return false
  if (snapshot.sessionRevision !== sessionRevision) return false

  const currentActorId = getActiveCacheActor()
  return snapshot.actorId === null || snapshot.actorId === currentActorId
}

export const registerSessionResetHandler = (handler: SessionResetHandler) => {
  resetHandlers.add(handler)
  return () => resetHandlers.delete(handler)
}

export const resetProtectedSessionState = (reason: SessionResetReason): SessionResetResult => {
  sessionRevision += 1
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
    changed: true,
    sessionRevision,
    ...storage,
    resetHandlerErrors,
  }
}

export const terminateAuthenticatedSession = (reason: AuthenticatedTerminationReason): SessionResetResult => {
  // A burst of protected requests may fail with 401 at the same time. Once
  // this session has already been terminated, do not reset stores or trigger
  // duplicate UI side effects. If a credential was reintroduced directly,
  // treat it as a new termination boundary for backwards-compatible callers.
  if (terminatedRevision === sessionRevision && !readAuthCredential()) {
    return {
      changed: false,
      sessionRevision,
      localStorageKeys: 0,
      sessionStorageKeys: 0,
      resetHandlerErrors: 0,
    }
  }

  const result = resetProtectedSessionState(reason)
  terminatedRevision = sessionRevision
  clearAuthCredential()
  return result
}

export const establishAuthenticatedSession = (token: string): AuthSessionEstablishResult => {
  const normalized = typeof token === 'string' ? token.trim() : ''
  if (!normalized) {
    return { established: false, replaced: false, sessionRevision }
  }

  const previousToken = readAuthCredential()
  const replaced = Boolean(previousToken && previousToken !== normalized)
  if (replaced) {
    resetProtectedSessionState('TOKEN_REPLACED')
  }

  // The credential helper is deliberately kept low-level; session creation
  // is the only application-level caller that writes a new token.
  writeAuthToken(normalized)

  if (readAuthCredential() !== normalized) {
    return { established: false, replaced, sessionRevision }
  }

  sessionRevision += 1
  terminatedRevision = null

  return { established: true, replaced, sessionRevision }
}
