import { afterEach, describe, expect, it } from 'vitest'

import {
  clearSelectedProjectIdCache,
  readAiPlannerDraftCache,
  readSelectedProjectIdCache,
  writeAiPlannerDraftCache,
  writeSelectedProjectIdCache,
} from './appCache'
import { readProjectListCache, writeProjectListCache } from './projectCache'
import { clearActiveCacheActor, setActiveCacheActor } from './cacheActor'

afterEach(() => {
  clearActiveCacheActor()
})

describe('actor-scoped cache policy', () => {
  it('fails closed when no actor is active', () => {
    clearActiveCacheActor()

    writeSelectedProjectIdCache('101')
    writeProjectListCache(0, [{ id: '101' }])
    writeAiPlannerDraftCache({ target: 'private' })

    expect(readSelectedProjectIdCache()).toBe('')
    expect(readProjectListCache(0)).toBeNull()
    expect(readAiPlannerDraftCache()).toBeNull()
    expect(window.localStorage.length).toBe(0)
  })

  it('isolates resource caches between actors', () => {
    setActiveCacheActor('1')
    writeSelectedProjectIdCache('101')
    writeProjectListCache(0, [{ id: '101', name: 'Alice project' }])
    writeAiPlannerDraftCache({ target: 'Alice plan' })

    setActiveCacheActor('2')
    expect(readSelectedProjectIdCache()).toBe('')
    expect(readProjectListCache(0)).toBeNull()
    expect(readAiPlannerDraftCache()).toBeNull()
    writeSelectedProjectIdCache('202')
    writeProjectListCache(0, [{ id: '202', name: 'Bob project' }])
    writeAiPlannerDraftCache({ target: 'Bob plan' })

    setActiveCacheActor('1')
    expect(readSelectedProjectIdCache()).toBe('101')
    expect(readProjectListCache(0)).toEqual([{ id: '101', name: 'Alice project' }])
    expect(readAiPlannerDraftCache()).toEqual({ target: 'Alice plan' })

    setActiveCacheActor('2')
    expect(readSelectedProjectIdCache()).toBe('202')
    expect(readProjectListCache(0)).toEqual([{ id: '202', name: 'Bob project' }])
    expect(readAiPlannerDraftCache()).toEqual({ target: 'Bob plan' })
  })

  it('does not upgrade legacy unscoped business keys', () => {
    window.localStorage.setItem('tick_selectedProjectId', JSON.stringify('legacy-project'))
    window.localStorage.setItem('tick_aiPlannerDraft_v1', JSON.stringify({ target: 'legacy-plan' }))

    setActiveCacheActor('1')

    expect(readSelectedProjectIdCache()).toBe('')
    expect(readAiPlannerDraftCache()).toBeNull()
    expect(window.localStorage.getItem('tick_selectedProjectId')).not.toBeNull()
    expect(window.localStorage.getItem('tick_aiPlannerDraft_v1')).not.toBeNull()
  })

  it('clears only the active actor selected project cache', () => {
    setActiveCacheActor('1')
    writeSelectedProjectIdCache('101')
    setActiveCacheActor('2')
    writeSelectedProjectIdCache('202')

    clearSelectedProjectIdCache()

    expect(readSelectedProjectIdCache()).toBe('')
    setActiveCacheActor('1')
    expect(readSelectedProjectIdCache()).toBe('101')
  })
})
