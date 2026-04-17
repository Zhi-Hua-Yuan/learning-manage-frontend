export const TASK_STATUS_TODO = 0
export const TASK_STATUS_DONE_BASIC = 1
export const TASK_STATUS_DONE_STANDARD = 2
export const TASK_STATUS_DONE_EXCELLENT = 3

export const isTaskCompleted = (status: number) => status >= TASK_STATUS_DONE_BASIC
