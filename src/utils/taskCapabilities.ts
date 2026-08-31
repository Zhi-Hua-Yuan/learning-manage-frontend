import type { TaskCapabilities, TaskModel } from '@/types/task'

export type TaskAction =
  | 'editContent'
  | 'changeStatus'
  | 'reorganize'
  | 'assign'
  | 'delete'

export const TASK_ACTION_CAPABILITY = {
  editContent: 'canEditContent',
  changeStatus: 'canChangeStatus',
  reorganize: 'canReorganize',
  assign: 'canAssign',
  delete: 'canDelete',
} as const satisfies Record<TaskAction, keyof TaskCapabilities>

export const hasTaskCapability = (
  task: TaskModel | null | undefined,
  capability: keyof TaskCapabilities,
) => task?.capabilities?.[capability] === true

export const canPerformTaskAction = (
  task: TaskModel | null | undefined,
  action: TaskAction,
) => hasTaskCapability(task, TASK_ACTION_CAPABILITY[action])
