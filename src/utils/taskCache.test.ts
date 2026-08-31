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
} from './taskCache'
import type { TaskModel } from '@/types/task'

const task = (id: string, projectId = '101', title = `Task ${id}`): TaskModel => ({
  id,
  projectId,
  milestoneId: null,
  createdByUserId: '301',
  assigneeUserId: null,
  assignedByUserId: null,
  assignedAt: null,
  title,
  description: null,
  status: 0,
  priority: 1,
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

const taskWithAllowedCapabilities = (id: string, projectId = '101'): TaskModel => ({
  ...task(id, projectId),
  capabilities: {
    canEditContent: true,
    canChangeStatus: true,
    canReorganize: true,
    canAssign: true,
    canDelete: true,
  },
})

describe('task cache coordination', () => {
  it('reads and writes project task lists', () => {
    writeTaskCache('101', [task('1')])

    expect(readTaskCache('101')).toEqual([task('1')])
    expect(readTaskCache('')).toBeNull()
  })

  it('strips allowed capabilities at both cache write and read boundaries', () => {
    writeTaskCache('101', [taskWithAllowedCapabilities('1')])

    expect(readTaskCache('101')).toEqual([task('1')])
  })

  it('upserts a new task into project and aggregate caches', () => {
    upsertTaskInCaches(task('1'))

    expect(readTaskCache('101')).toEqual([task('1')])
    expect(readAllProjectsTaskCache()).toEqual({ '101': [task('1')] })
  })

  it('updates an existing task without duplicating it', () => {
    upsertTaskInCaches(task('1'))
    upsertTaskInCaches({ ...task('1'), status: 2, title: 'Updated' })

    expect(readTaskCache('101')).toEqual([{ ...task('1'), status: 2, title: 'Updated' }])
  })

  it('removes a task from both caches', () => {
    upsertTaskInCaches(task('1'))
    upsertTaskInCaches(task('2'))

    removeTaskFromCaches({ id: '1', projectId: '101' })

    expect(readTaskCache('101')).toEqual([task('2')])
    expect(readAllProjectsTaskCache()).toEqual({ '101': [task('2')] })
  })

  it('groups records by project', () => {
    writeAggregateTaskCacheFromRecords([task('1', '101'), task('2', '202')])

    expect(readAllProjectsTaskCache()).toEqual({
      '101': [task('1', '101')],
      '202': [task('2', '202')],
    })
  })

  it('syncs one project without overwriting other projects', () => {
    writeAllProjectsTaskCache({ '101': [task('1', '101')], '202': [task('2', '202')] })

    syncAggregateTaskCacheByProject('101', [task('3', '101')])

    expect(readAllProjectsTaskCache()).toEqual({
      '101': [task('3', '101')],
      '202': [task('2', '202')],
    })
  })

  it('removes all caches for one project', () => {
    upsertTaskInCaches(task('1'))
    upsertTaskInCaches(task('2', '202'))

    removeProjectTaskCaches('101')

    expect(readTaskCache('101')).toBeNull()
    expect(readAllProjectsTaskCache()).toEqual({ '202': [task('2', '202')] })
  })

  it('clears all project task caches when no project is specified', () => {
    upsertTaskInCaches(task('1'))
    upsertTaskInCaches(task('2', '202'))

    clearTaskCache()

    expect(readTaskCache('101')).toBeNull()
    expect(readTaskCache('202')).toBeNull()
    expect(readAllProjectsTaskCache()).toBeNull()
  })
})
