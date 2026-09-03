import { beforeEach, describe, expect, it } from 'vitest'
import { clearActiveCacheActor, setActiveCacheActor } from './cacheActor'
import {
  getSessionOperationStorageKey,
  readSessionOperationId,
  writeSessionOperationId,
} from './sessionOperation'

describe('session operation storage', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    clearActiveCacheActor()
  })

  it('scopes operation keys by the active actor', () => {
    setActiveCacheActor('7')

    expect(getSessionOperationStorageKey('draft-9')).toBe(
      'ai:draft:confirm-operation:draft-9:actor-7',
    )
    expect(writeSessionOperationId('draft-9', 'operation-1')).toBe(true)
    expect(readSessionOperationId('draft-9')).toBe('operation-1')
    expect(window.sessionStorage.getItem('ai:draft:confirm-operation:draft-9')).toBeNull()
  })

  it('fails closed when no actor is active', () => {
    expect(getSessionOperationStorageKey('draft-9')).toBeNull()
    expect(writeSessionOperationId('draft-9', 'operation-1')).toBe(false)
    expect(readSessionOperationId('draft-9')).toBe('')
    expect(window.sessionStorage.length).toBe(0)
  })

  it('does not read another actor operation', () => {
    window.sessionStorage.setItem(
      'ai:draft:confirm-operation:draft-9:actor-7',
      'operation-1',
    )
    setActiveCacheActor('8')

    expect(readSessionOperationId('draft-9')).toBe('')
  })
})
