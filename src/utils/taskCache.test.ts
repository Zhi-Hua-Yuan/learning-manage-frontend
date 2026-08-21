import { describe, expect, it } from 'vitest'

import {
  clearTaskCache,
  readAllProjectsTaskCache,
  readTaskCache,
  removeProjectTaskCaches,
  removeTaskFromCaches,
  syncAggregateTaskCacheByProject,
  upsertTaskInCaches,
  writeAggregateTaskCacheFromRecords,
  writeAllProjectsTaskCache,
  writeTaskCache,
  type Task,
} from './taskCache'

const task = (id: string, projectId = 'project-1', title = `Task ${id}`): Task => ({
  id,
  title,
  status: 0,
  priority: 1,
  projectId,
})

describe('task cache coordination', () => {
  it('reads and writes project task lists', () => {
    writeTaskCache('project-1', [task('task-1')])

    expect(readTaskCache('project-1')).toEqual([task('task-1')])
    expect(readTaskCache('')).toBeNull()
  })

  it('upserts a new task into project and aggregate caches', () => {
    upsertTaskInCaches(task('task-1'))

    expect(readTaskCache('project-1')).toEqual([task('task-1')])
    expect(readAllProjectsTaskCache()).toEqual({ 'project-1': [task('task-1')] })
  })

  it('updates an existing task without duplicating it', () => {
    upsertTaskInCaches(task('task-1'))
    upsertTaskInCaches({ ...task('task-1'), status: 2, title: 'Updated' })

    expect(readTaskCache('project-1')).toEqual([{ ...task('task-1'), status: 2, title: 'Updated' }])
  })

  it('removes a task from both caches', () => {
    upsertTaskInCaches(task('task-1'))
    upsertTaskInCaches(task('task-2'))

    removeTaskFromCaches({ id: 'task-1', projectId: 'project-1' })

    expect(readTaskCache('project-1')).toEqual([task('task-2')])
    expect(readAllProjectsTaskCache()).toEqual({ 'project-1': [task('task-2')] })
  })

  it('groups records by project', () => {
    writeAggregateTaskCacheFromRecords([task('task-1', 'project-1'), task('task-2', 'project-2')])

    expect(readAllProjectsTaskCache()).toEqual({
      'project-1': [task('task-1', 'project-1')],
      'project-2': [task('task-2', 'project-2')],
    })
  })

  it('syncs one project without overwriting other projects', () => {
    writeAllProjectsTaskCache({ 'project-1': [task('old', 'project-1')], 'project-2': [task('keep', 'project-2')] })

    syncAggregateTaskCacheByProject('project-1', [task('new', 'project-1')])

    expect(readAllProjectsTaskCache()).toEqual({
      'project-1': [task('new', 'project-1')],
      'project-2': [task('keep', 'project-2')],
    })
  })

  it('removes all caches for one project', () => {
    upsertTaskInCaches(task('task-1'))
    upsertTaskInCaches(task('task-2', 'project-2'))

    removeProjectTaskCaches('project-1')

    expect(readTaskCache('project-1')).toBeNull()
    expect(readAllProjectsTaskCache()).toEqual({ 'project-2': [task('task-2', 'project-2')] })
  })

  it('clears all project task caches when no project is specified', () => {
    upsertTaskInCaches(task('task-1'))
    upsertTaskInCaches(task('task-2', 'project-2'))

    clearTaskCache()

    expect(readTaskCache('project-1')).toBeNull()
    expect(readTaskCache('project-2')).toBeNull()
    expect(readAllProjectsTaskCache()).toBeNull()
  })
})
