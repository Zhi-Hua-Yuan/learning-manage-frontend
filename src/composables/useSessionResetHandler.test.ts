import { effectScope } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'

import { resetProtectedSessionState } from '@/utils/sessionLifecycle'
import { useSessionResetHandler } from './useSessionResetHandler'

describe('useSessionResetHandler', () => {
  beforeEach(() => {
    resetProtectedSessionState('USER_LOGOUT')
  })

  it('registers immediately and unregisters with the owner scope', () => {
    const calls: string[] = []
    const scope = effectScope()

    scope.run(() => {
      useSessionResetHandler((reason) => calls.push(reason))
    })

    resetProtectedSessionState('AUTHENTICATION_REQUIRED')
    expect(calls).toEqual(['AUTHENTICATION_REQUIRED'])

    scope.stop()
    resetProtectedSessionState('ACTOR_CHANGED')
    expect(calls).toEqual(['AUTHENTICATION_REQUIRED'])
  })
})
