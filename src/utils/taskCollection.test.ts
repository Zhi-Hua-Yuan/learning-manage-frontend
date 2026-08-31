import { describe, expect, it } from 'vitest'

import { DENY_ALL_TASK_CAPABILITIES } from '@/types/task'
import { findTaskById, normalizeTaskRecords } from './taskCollection'

describe('task collection normalization', () => {
  it('normalizes wire records into the shared TaskModel shape', () => {
    const [task] = normalizeTaskRecords([
      {
        id: 101,
        projectId: 202,
        createdByUserId: 303,
        assigneeUserId: 404,
        assignedByUserId: 505,
        assignedAt: '2026-08-31T10:00:00Z',
        title: 'Shared model',
        description: null,
        status: '2',
        priority: '3',
        capabilities: {
          canEditContent: true,
          canChangeStatus: true,
          canReorganize: false,
          canAssign: false,
          canDelete: false,
        },
      },
    ])

    expect(task).toMatchObject({
      id: '101',
      projectId: '202',
      createdByUserId: '303',
      assigneeUserId: '404',
      assignedByUserId: '505',
      status: 2,
      priority: 3,
    })
    expect(task?.capabilities).toEqual({
      canEditContent: true,
      canChangeStatus: true,
      canReorganize: false,
      canAssign: false,
      canDelete: false,
    })
  })

  it('keeps valid records while filtering records with invalid identity', () => {
    const records = normalizeTaskRecords([
      { id: 'bad', projectId: 2, createdByUserId: 3, title: 'Invalid' },
      { id: 1, projectId: 2, createdByUserId: 3, title: 'Valid' },
    ])

    expect(records).toHaveLength(1)
    expect(records[0]?.title).toBe('Valid')
  })

  it('normalizes missing capabilities to the deny-all object', () => {
    const [task] = normalizeTaskRecords([{ id: 1, projectId: 2, createdByUserId: 3 }])

    expect(task?.capabilities).toEqual(DENY_ALL_TASK_CAPABILITIES)
  })

  it('finds the selected task by its normalized string id', () => {
    const tasks = normalizeTaskRecords([{ id: 1, projectId: 2, createdByUserId: 3 }])

    expect(findTaskById(tasks, '1')?.id).toBe('1')
    expect(findTaskById(tasks, '999')).toBeNull()
  })
})
