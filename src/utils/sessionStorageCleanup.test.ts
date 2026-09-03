import { beforeEach, describe, expect, it } from 'vitest'
import { writeAuthToken } from './authToken'
import {
  clearProtectedSessionStorage,
  isProtectedActorStorageKey,
  isSessionOperationStorageKey,
} from './sessionStorageCleanup'

describe('protected session storage cleanup', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('matches only protected actor resources and operations', () => {
    expect(isProtectedActorStorageKey('tick:cache:task-list:v1:1:actor-7')).toBe(true)
    expect(isProtectedActorStorageKey('tick_themeMode')).toBe(false)
    expect(isSessionOperationStorageKey('ai:draft:confirm-operation:9:actor-7')).toBe(true)
    expect(isSessionOperationStorageKey('tick_backend_cache_reload_lock')).toBe(false)
  })

  it('clears all protected actor data and legacy business keys while preserving preferences and metadata', () => {
    window.localStorage.setItem('tick_selectedProjectId:actor-1', '1')
    window.localStorage.setItem('tick:cache:project-list:status-0:v1:actor-1', 'projects')
    window.localStorage.setItem('tick:cache:task-list:v1:1:actor-2', 'tasks')
    window.localStorage.setItem('tick_aiPlannerDraft_v1:actor-2', 'draft')
    window.localStorage.setItem('tick_selectedProjectId', 'legacy')
    window.localStorage.setItem('token', 'secret-token')
    window.localStorage.setItem('tick_themeMode', 'dark')
    window.localStorage.setItem('tick_backend_cache_version', '3')
    window.sessionStorage.setItem('ai:draft:confirm-operation:9', 'legacy-op')
    window.sessionStorage.setItem('ai:draft:confirm-operation:9:actor-2', 'op')
    window.sessionStorage.setItem('tick_backend_cache_reload_lock', '3')

    const result = clearProtectedSessionStorage()

    expect(result.localStorageKeys).toBe(5)
    expect(result.sessionStorageKeys).toBe(2)
    expect(window.localStorage.getItem('tick_themeMode')).toBe('dark')
    expect(window.localStorage.getItem('tick_backend_cache_version')).toBe('3')
    expect(window.localStorage.getItem('token')).toBe('secret-token')
    expect(window.sessionStorage.getItem('tick_backend_cache_reload_lock')).toBe('3')
    expect(window.localStorage.getItem('tick_selectedProjectId:actor-1')).toBeNull()
    expect(window.sessionStorage.getItem('ai:draft:confirm-operation:9:actor-2')).toBeNull()
  })

  it('is safe when storage is already empty', () => {
    expect(clearProtectedSessionStorage()).toEqual({ localStorageKeys: 0, sessionStorageKeys: 0 })
    writeAuthToken('still-present')
    expect(window.localStorage.getItem('token')).toBe('still-present')
  })
})
