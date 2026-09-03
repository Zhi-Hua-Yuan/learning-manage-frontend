import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setActiveCacheActor } from './cacheActor'
import { writeAuthToken } from './authToken'
import {
  registerSessionResetHandler,
  resetProtectedSessionState,
  terminateAuthenticatedSession,
} from './sessionLifecycle'

describe('session lifecycle cleanup kernel', () => {
  let unregisterHandlers: Array<() => boolean> = []

  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    unregisterHandlers.forEach((unregister) => unregister())
    unregisterHandlers = []
    setActiveCacheActor('7')
  })

  it('runs reset handlers with a reason and isolates handler failures', () => {
    const first = vi.fn()
    const second = vi.fn(() => { throw new Error('reset failed') })
    const third = vi.fn()
    unregisterHandlers = [
      registerSessionResetHandler(first),
      registerSessionResetHandler(second),
      registerSessionResetHandler(third),
    ]

    const result = resetProtectedSessionState('ACTOR_CHANGED')

    expect(first).toHaveBeenCalledWith('ACTOR_CHANGED')
    expect(second).toHaveBeenCalledWith('ACTOR_CHANGED')
    expect(third).toHaveBeenCalledWith('ACTOR_CHANGED')
    expect(result.resetHandlerErrors).toBe(1)
    expect(result.changed).toBe(true)
  })

  it('keeps the credential for a state-only reset', () => {
    writeAuthToken('keep-token')

    resetProtectedSessionState('ACTOR_CHANGED')

    expect(window.localStorage.getItem('token')).toBe('keep-token')
  })

  it('clears the credential for an authenticated session termination', () => {
    writeAuthToken('remove-token')

    terminateAuthenticatedSession('USER_LOGOUT')

    expect(window.localStorage.getItem('token')).toBeNull()
  })

  it('is idempotent', () => {
    expect(() => {
      terminateAuthenticatedSession('AUTHENTICATION_REQUIRED')
      terminateAuthenticatedSession('AUTHENTICATION_REQUIRED')
    }).not.toThrow()
  })
})
