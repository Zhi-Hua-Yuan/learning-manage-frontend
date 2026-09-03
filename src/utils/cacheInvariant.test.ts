import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  clearAiPlannerDraftCache,
  clearSelectedProjectIdCache,
  clearTaskListReplanStateCache,
  clearTaskTodayAiOrderCache,
  readAiPlannerDraftCache,
  readSelectedProjectIdCache,
  readTaskListReplanStateCache,
  readTaskTodayAiOrderCache,
  writeAiPlannerDraftCache,
  writeSelectedProjectIdCache,
  writeTaskListReplanStateCache,
  writeTaskTodayAiOrderCache,
} from './appCache'
import {
  clearProjectListCache,
  clearProjectProgressCache,
  readProjectListCache,
  readProjectProgressCache,
  writeProjectListCache,
  writeProjectProgressCache,
} from './projectCache'
import {
  clearTaskCache,
  readAllProjectsTaskCache,
  readTaskCache,
  writeAllProjectsTaskCache,
  writeTaskCache,
} from './taskCache'
import { clearActiveCacheActor, setActiveCacheActor } from './cacheActor'
import {
  CACHE_REGISTRY,
  getActorAiPlannerDraftCacheEntry,
  getActorProjectListCacheEntry,
  getActorProjectProgressCacheEntry,
  getActorTaskListAllCacheEntry,
  getActorTaskListReplanStateCacheEntry,
  getActorTaskListCacheEntry,
  getActorTaskTodayAiOrderCacheEntry,
  getActorScopedCacheEntry,
} from './cacheRegistry'
import { listStorageKeys } from './cacheClient'
import type { TaskModel } from '@/types/task'

const taskSnapshot = (id: string, projectId: string, createdByUserId: string): TaskModel => ({
  id,
  projectId,
  milestoneId: null,
  createdByUserId,
  assigneeUserId: null,
  assignedByUserId: null,
  assignedAt: null,
  title: `Task ${id}`,
  description: null,
  status: 0,
  priority: 0,
  dueDate: null,
  completedAt: null,
  createTime: null,
  updateTime: null,
  capabilities: {
    canEditContent: false,
    canChangeStatus: false,
    canReorganize: false,
    canAssign: false,
    canDelete: false,
  },
})

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  clearActiveCacheActor()
  window.localStorage.clear()
})

describe('actor cache invariants', () => {
  it('resolves every protected asset to an actor-scoped entry', () => {
    const entries = [
      getActorScopedCacheEntry(CACHE_REGISTRY.selectedProjectId, 'alice'),
      getActorAiPlannerDraftCacheEntry('alice'),
      getActorProjectListCacheEntry(0, 'alice'),
      getActorProjectProgressCacheEntry('alice'),
      getActorTaskListCacheEntry('101', 'alice'),
      getActorTaskListAllCacheEntry('alice'),
      getActorTaskTodayAiOrderCacheEntry('alice'),
      getActorTaskListReplanStateCacheEntry('alice'),
    ]

    entries.forEach((entry) => {
      expect(entry).toMatchObject({
        scope: 'ACTOR_SCOPED',
        actorId: 'alice',
      })
      expect(entry?.key).toContain(':actor-alice')
    })
  })

  it('isolates all protected cache assets and aggregate task data between actors', () => {
    setActiveCacheActor('alice')
    writeSelectedProjectIdCache('101')
    writeAiPlannerDraftCache({ actor: 'alice' })
    writeProjectListCache(0, [{ id: 'alice-project' }])
    writeProjectProgressCache('101', 42)
    writeTaskCache('101', [taskSnapshot('1001', '101', '1')])
    writeAllProjectsTaskCache({ '101': [taskSnapshot('1001', '101', '1')] })
    writeTaskTodayAiOrderCache(['1001'])
    writeTaskListReplanStateCache({ actor: 'alice' })

    setActiveCacheActor('bob')
    expect(readSelectedProjectIdCache()).toBe('')
    expect(readAiPlannerDraftCache()).toBeNull()
    expect(readProjectListCache(0)).toBeNull()
    expect(readProjectProgressCache('101')).toBeNull()
    expect(readTaskCache('101')).toBeNull()
    expect(readAllProjectsTaskCache()).toBeNull()
    expect(readTaskTodayAiOrderCache()).toBeNull()
    expect(readTaskListReplanStateCache()).toBeNull()

    writeSelectedProjectIdCache('202')
    writeAiPlannerDraftCache({ actor: 'bob' })
    writeProjectListCache(0, [{ id: 'bob-project' }])
    writeProjectProgressCache('202', 84)
    writeTaskCache('202', [taskSnapshot('2002', '202', '2')])
    writeAllProjectsTaskCache({ '202': [taskSnapshot('2002', '202', '2')] })
    writeTaskTodayAiOrderCache(['2002'])
    writeTaskListReplanStateCache({ actor: 'bob' })

    setActiveCacheActor('alice')
    expect(readSelectedProjectIdCache()).toBe('101')
    expect(readAiPlannerDraftCache()).toEqual({ actor: 'alice' })
    expect(readProjectListCache(0)).toEqual([{ id: 'alice-project' }])
    expect(readProjectProgressCache('101')).toBe(42)
    expect(readTaskCache('101')?.map((task) => task.id)).toEqual(['1001'])
    expect(readAllProjectsTaskCache()?.['101']?.map((task) => task.id)).toEqual(['1001'])
    expect(readTaskTodayAiOrderCache()).toEqual(['1001'])
    expect(readTaskListReplanStateCache()).toEqual({ actor: 'alice' })
  })

  it('clears only the active actor namespace', () => {
    setActiveCacheActor('alice')
    writeSelectedProjectIdCache('101')
    writeProjectListCache(0, [{ id: 'alice-project' }])
    writeProjectProgressCache('101', 42)
    writeTaskCache('101', [taskSnapshot('1001', '101', '1')])

    setActiveCacheActor('bob')
    writeSelectedProjectIdCache('202')
    writeProjectListCache(0, [{ id: 'bob-project' }])
    writeProjectProgressCache('202', 84)
    writeTaskCache('202', [taskSnapshot('2002', '202', '2')])

    setActiveCacheActor('alice')
    clearSelectedProjectIdCache()
    clearProjectListCache()
    clearProjectProgressCache()
    clearTaskCache()
    clearAiPlannerDraftCache()
    clearTaskTodayAiOrderCache()
    clearTaskListReplanStateCache()

    expect(readSelectedProjectIdCache()).toBe('')
    expect(readProjectListCache(0)).toBeNull()
    expect(readProjectProgressCache('101')).toBeNull()
    expect(readTaskCache('101')).toBeNull()

    setActiveCacheActor('bob')
    expect(readSelectedProjectIdCache()).toBe('202')
    expect(readProjectListCache(0)).toEqual([{ id: 'bob-project' }])
    expect(readProjectProgressCache('202')).toBe(84)
    expect(readTaskCache('202')?.map((task) => task.id)).toEqual(['2002'])
    expect(listStorageKeys().every((key) => key.includes(':actor-bob'))).toBe(true)
  })
})
