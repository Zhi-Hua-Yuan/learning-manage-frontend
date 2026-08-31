import { describe, expect, it } from 'vitest'

import type { TaskModel } from '@/types/task'
import {
  canPerformTaskAction,
  hasTaskCapability,
  TASK_ACTION_CAPABILITY,
} from './taskCapabilities'

const task = (capabilities: TaskModel['capabilities']): TaskModel => ({
  id: 'task-1',
  projectId: 'project-1',
  milestoneId: null,
  createdByUserId: 'user-1',
  assigneeUserId: null,
  assignedByUserId: null,
  assignedAt: null,
  title: 'Capability task',
  description: null,
  status: 0,
  priority: 0,
  dueDate: null,
  completedAt: null,
  createTime: null,
  updateTime: null,
  capabilities,
})

describe('task capability policy', () => {
  it('keeps the frozen action-to-capability mapping precise', () => {
    expect(TASK_ACTION_CAPABILITY).toEqual({
      editContent: 'canEditContent',
      changeStatus: 'canChangeStatus',
      reorganize: 'canReorganize',
      assign: 'canAssign',
      delete: 'canDelete',
    })
  })

  it('allows only the action backed by the matching capability', () => {
    const editOnlyTask = task({
      canEditContent: true,
      canChangeStatus: false,
      canReorganize: false,
      canAssign: false,
      canDelete: false,
    })

    expect(canPerformTaskAction(editOnlyTask, 'editContent')).toBe(true)
    expect(canPerformTaskAction(editOnlyTask, 'changeStatus')).toBe(false)
    expect(canPerformTaskAction(editOnlyTask, 'reorganize')).toBe(false)
    expect(canPerformTaskAction(editOnlyTask, 'assign')).toBe(false)
    expect(canPerformTaskAction(editOnlyTask, 'delete')).toBe(false)
  })

  it('fails closed when the task is absent or a capability is not strictly true', () => {
    const deniedTask = task({
      canEditContent: false,
      canChangeStatus: false,
      canReorganize: false,
      canAssign: false,
      canDelete: false,
    })

    expect(hasTaskCapability(null, 'canDelete')).toBe(false)
    expect(hasTaskCapability(undefined, 'canDelete')).toBe(false)
    expect(canPerformTaskAction(deniedTask, 'delete')).toBe(false)
  })
})
