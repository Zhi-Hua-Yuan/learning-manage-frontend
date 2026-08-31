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

export const TASK_ACTION_DENIED_MESSAGE: Record<TaskAction, string> = {
  editContent: '你可以查看此任务，但不能修改标题、描述或截止日期。',
  changeStatus: '你没有变更此任务状态的权限。',
  reorganize: '你没有调整此任务优先级或所属阶段的权限。',
  assign: '你没有变更此任务负责人的权限。',
  delete: '你没有删除此任务的权限。',
}

export interface TaskActionUiState {
  allowed: boolean
  deniedMessage: string | null
}

export const hasTaskCapability = (
  task: TaskModel | null | undefined,
  capability: keyof TaskCapabilities,
) => task?.capabilities?.[capability] === true

export const canPerformTaskAction = (
  task: TaskModel | null | undefined,
  action: TaskAction,
) => hasTaskCapability(task, TASK_ACTION_CAPABILITY[action])

export const resolveTaskActionUiState = (
  task: TaskModel | null | undefined,
  action: TaskAction,
): TaskActionUiState => {
  const allowed = canPerformTaskAction(task, action)

  return {
    allowed,
    deniedMessage: allowed ? null : TASK_ACTION_DENIED_MESSAGE[action],
  }
}
