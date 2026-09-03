import { beforeEach, describe, expect, it } from 'vitest'

import { dropLegacyUnscopedBusinessCaches, isLegacyUnscopedBusinessCacheKey } from './cacheMigration'

describe('legacy business cache migration', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('matches only known unscoped business cache keys', () => {
    expect(isLegacyUnscopedBusinessCacheKey('tick_selectedProjectId')).toBe(true)
    expect(isLegacyUnscopedBusinessCacheKey('tick:cache:project-list:status-0:v1')).toBe(true)
    expect(isLegacyUnscopedBusinessCacheKey('tick:cache:task-list:v1:101')).toBe(true)
    expect(isLegacyUnscopedBusinessCacheKey('tick:cache:task-list:v1:101:actor-1')).toBe(false)
    expect(isLegacyUnscopedBusinessCacheKey('tick:themeMode')).toBe(false)
  })

  it('drops legacy business keys without reading or migrating their payloads', () => {
    const legacyKeys = [
      'tick_selectedProjectId',
      'tick:cache:project-list:status-0:v1',
      'tick:cache:project-list:status-1:v1',
      'tick:cache:project-progress:v2',
      'tick:cache:task-list:v1:101',
      'tick:cache:task-list:all:v1',
      'tick_aiPlannerDraft_v1',
      'tick:cache:task-today-ai-order:v1',
      'tick:cache:task-list-replan-state:v1',
    ]
    legacyKeys.forEach((key) => window.localStorage.setItem(key, JSON.stringify({ secret: 'legacy' })))

    dropLegacyUnscopedBusinessCaches()

    legacyKeys.forEach((key) => expect(window.localStorage.getItem(key)).toBeNull())
    expect(window.localStorage.length).toBe(0)
  })

  it('preserves actor-scoped caches, global preferences, credentials and E2 operation state', () => {
    const keep = {
      'tick_selectedProjectId:actor-1': '1',
      'tick:cache:task-list:v1:101:actor-1': 'actor-cache',
      tick_themeMode: 'dark',
      tick_sidebarWidth: '256',
      tick_detailWidth: '420',
      token: 'token-value',
      tick_backend_cache_version: '1',
    }
    Object.entries(keep).forEach(([key, value]) => window.localStorage.setItem(key, value))
    window.sessionStorage.setItem('ai:draft:confirm-operation:abc', 'operation-1')

    dropLegacyUnscopedBusinessCaches()

    Object.entries(keep).forEach(([key, value]) => expect(window.localStorage.getItem(key)).toBe(value))
    expect(window.sessionStorage.getItem('ai:draft:confirm-operation:abc')).toBe('operation-1')
  })

  it('is idempotent', () => {
    window.localStorage.setItem('tick_selectedProjectId', 'legacy')

    dropLegacyUnscopedBusinessCaches()
    dropLegacyUnscopedBusinessCaches()

    expect(window.localStorage.getItem('tick_selectedProjectId')).toBeNull()
  })
})
