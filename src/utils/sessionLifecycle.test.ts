import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setActiveCacheActor } from './cacheActor'
import { writeAuthToken } from './authToken'
import {
  establishAuthenticatedSession,
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

    const result = terminateAuthenticatedSession('USER_LOGOUT')

    expect(result.changed).toBe(true)
    expect(window.localStorage.getItem('token')).toBeNull()
  })

  it('is idempotent and reports only the first termination as changed', () => {
    establishAuthenticatedSession('expired-token')

    const first = terminateAuthenticatedSession('AUTHENTICATION_REQUIRED')
    const second = terminateAuthenticatedSession('AUTHENTICATION_REQUIRED')

    expect(first.changed).toBe(true)
    expect(second.changed).toBe(false)
    expect(second.resetHandlerErrors).toBe(0)
  })

  it('resets the previous state before establishing a replacement token', () => {
    writeAuthToken('old-token')
    const reset = vi.fn()
    unregisterHandlers.push(registerSessionResetHandler(reset))

    const result = establishAuthenticatedSession('new-token')

    expect(result).toMatchObject({ established: true, replaced: true })
    expect(reset).toHaveBeenCalledWith('TOKEN_REPLACED')
    expect(window.localStorage.getItem('token')).toBe('new-token')
  })

  it('rejects an empty token without changing the current session', () => {
    writeAuthToken('existing-token')

    const result = establishAuthenticatedSession('   ')

    expect(result.established).toBe(false)
    expect(window.localStorage.getItem('token')).toBe('existing-token')
  })
})
