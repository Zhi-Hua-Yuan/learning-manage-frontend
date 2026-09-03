import { describe, expect, it, vi } from 'vitest'

import {
  clearBackendInvalidatedCaches,
  isBackendVersionAffectedCacheKey,
  syncBackendCacheVersion,
} from './cacheVersion'
import { dropLegacyUnscopedBusinessCaches } from './cacheMigration'

describe('backend cache version synchronization', () => {
  it.each([
    'tick_selectedProjectId:actor-1',
    'tick:cache:project-list:status-0:v1:actor-1',
    'tick:cache:project-list:status-1:v1:actor-user%3A1',
    'tick:cache:project-progress:v2:actor-2',
    'tick:cache:task-list:v1:101:actor-1',
    'tick:cache:task-list:all:v1:actor-1',
    'tick:cache:task-today-ai-order:v1:actor-1',
    'tick:cache:task-list-replan-state:v1:actor-1',
  ])('matches backend-invalidated actor resource key: %s', (key) => {
    expect(isBackendVersionAffectedCacheKey(key)).toBe(true)
  })

  it.each([
    'tick_selectedProjectId',
    'tick:cache:project-list:status-0:v1',
    'tick:cache:task-list:v1:101',
    'tick_aiPlannerDraft_v1:actor-1',
    'tick_themeMode',
    'tick_sidebarWidth',
    'tick_detailWidth',
    'token',
    'tick_backend_cache_version',
    'tick_backend_cache_reload_lock',
    'ai:draft:confirm-operation:123',
  ])('does not match preserved or legacy key: %s', (key) => {
    expect(isBackendVersionAffectedCacheKey(key)).toBe(false)
  })

  it('clears backend-invalidated resources for every actor and preserves unrelated state', () => {
    const invalidatedKeys = [
      'tick_selectedProjectId:actor-1',
      'tick:cache:project-list:status-0:v1:actor-1',
      'tick:cache:project-progress:v2:actor-2',
      'tick:cache:task-list:v1:101:actor-1',
      'tick:cache:task-list:all:v1:actor-2',
      'tick:cache:task-today-ai-order:v1:actor-1',
      'tick:cache:task-list-replan-state:v1:actor-2',
    ]
    const preservedKeys = [
      'tick_aiPlannerDraft_v1:actor-1',
      'tick_themeMode',
      'tick_sidebarWidth',
      'tick_detailWidth',
      'token',
      'tick_backend_cache_version',
      'tick_backend_cache_reload_lock',
      'ai:draft:confirm-operation:123',
      'tick:unrelated',
    ]

    invalidatedKeys.forEach((key) => window.localStorage.setItem(key, 'remove'))
    preservedKeys.forEach((key) => window.localStorage.setItem(key, 'keep'))
    window.sessionStorage.setItem('ai:draft:confirm-operation:123', 'keep-session-operation')

    expect(clearBackendInvalidatedCaches()).toEqual({
      scanned: invalidatedKeys.length + preservedKeys.length,
      matched: invalidatedKeys.length,
    })
    invalidatedKeys.forEach((key) => expect(window.localStorage.getItem(key)).toBeNull())
    preservedKeys.forEach((key) => expect(window.localStorage.getItem(key)).toBe('keep'))
    expect(window.sessionStorage.getItem('ai:draft:confirm-operation:123')).toBe('keep-session-operation')
  })

  it('records the first version without invalidating caches', () => {
    window.localStorage.setItem('tick:cache:task-list:v1:1:actor-1', 'cached')
    window.localStorage.setItem('tick_selectedProjectId', 'legacy')
    window.sessionStorage.setItem('ai:draft:confirm-operation:123', 'legacy')

    expect(syncBackendCacheVersion({ 'x-cache-version': ' 1 ' }, null)).toEqual({
      changed: false,
      currentVersion: '1',
      previousVersion: '',
      shouldReload: false,
    })
    expect(window.localStorage.getItem('tick:cache:task-list:v1:1:actor-1')).toBe('cached')
    expect(window.localStorage.getItem('tick_selectedProjectId')).toBeNull()
    expect(window.sessionStorage.getItem('ai:draft:confirm-operation:123')).toBe('legacy')
  })

  it('does nothing when the version is unchanged', () => {
    window.localStorage.setItem('tick_backend_cache_version', '1')
    window.localStorage.setItem('tick:cache:task-list:v1:1:actor-1', 'cached')

    expect(syncBackendCacheVersion(null, { data: { version: 1 } })).toEqual({
      changed: false,
      currentVersion: '1',
      previousVersion: '1',
      shouldReload: false,
    })
    expect(window.localStorage.getItem('tick:cache:task-list:v1:1:actor-1')).toBe('cached')
  })

  it('clears tick caches when the backend version changes', () => {
    window.localStorage.setItem('tick_backend_cache_version', '1')
    window.localStorage.setItem('tick:cache:task-list:v1:1', 'cached')
    window.localStorage.setItem('tick:cache:task-list:v1:1:actor-1', 'cached-actor')
    window.localStorage.setItem('tick_aiPlannerDraft_v1:actor-1', 'keep-draft')
    window.localStorage.setItem('tick_themeMode', 'dark')
    window.localStorage.setItem('tick_sidebarWidth', '256')
    window.localStorage.setItem('tick_backend_cache_version:metadata', 'keep')

    const result = syncBackendCacheVersion(null, { cacheVersion: 2 })

    expect(result).toMatchObject({ changed: true, currentVersion: '2', previousVersion: '1' })
    expect(window.localStorage.getItem('tick:cache:task-list:v1:1')).toBeNull()
    expect(window.localStorage.getItem('tick:cache:task-list:v1:1:actor-1')).toBeNull()
    expect(window.localStorage.getItem('tick_aiPlannerDraft_v1:actor-1')).toBe('keep-draft')
    expect(window.localStorage.getItem('tick_themeMode')).toBe('dark')
    expect(window.localStorage.getItem('tick_sidebarWidth')).toBe('256')
    expect(window.localStorage.getItem('tick_backend_cache_version:metadata')).toBe('keep')
    expect(window.localStorage.getItem('tick_backend_cache_version')).toBe('2')
  })

  it('drops all legacy localStorage business keys without deleting global preferences', () => {
    window.localStorage.setItem('tick_selectedProjectId', 'legacy')
    window.localStorage.setItem('tick:cache:project-list:status-0:v1', 'legacy')
    window.localStorage.setItem('tick_aiPlannerDraft_v1', 'legacy')
    window.localStorage.setItem('tick_themeMode', 'dark')
    window.sessionStorage.setItem('ai:draft:confirm-operation:abc', 'keep-for-e2')

    dropLegacyUnscopedBusinessCaches()

    expect(window.localStorage.getItem('tick_selectedProjectId')).toBeNull()
    expect(window.localStorage.getItem('tick:cache:project-list:status-0:v1')).toBeNull()
    expect(window.localStorage.getItem('tick_aiPlannerDraft_v1')).toBeNull()
    expect(window.localStorage.getItem('tick_themeMode')).toBe('dark')
    expect(window.sessionStorage.getItem('ai:draft:confirm-operation:abc')).toBe('keep-for-e2')
  })

  it('prefers a recognized header over a payload version', () => {
    const result = syncBackendCacheVersion(new Headers({ 'x-data-version': 'header-v2' }), {
      version: 'payload-v1',
    })

    expect(result?.currentVersion).toBe('header-v2')
  })

  it('locks reload requests to one per version', () => {
    window.localStorage.setItem('tick_backend_cache_version', '1')

    expect(syncBackendCacheVersion(null, { version: '2' })?.shouldReload).toBe(true)
    window.localStorage.setItem('tick_backend_cache_version', '1')
    expect(syncBackendCacheVersion(null, { version: '2' })?.shouldReload).toBe(false)
  })

  it('returns null without browser storage', () => {
    const storage = vi.spyOn(window, 'localStorage', 'get').mockReturnValue(undefined as never)

    expect(syncBackendCacheVersion(null, { version: '1' })).toBeNull()

    storage.mockRestore()
  })
})
