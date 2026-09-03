import { describe, expect, it, vi } from 'vitest'

import { syncBackendCacheVersion } from './cacheVersion'
import { dropLegacyUnscopedBusinessCaches } from './cacheMigration'

describe('backend cache version synchronization', () => {
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
