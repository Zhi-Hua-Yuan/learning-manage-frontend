import {
  TASK_STATUS_DONE_EXCELLENT,
  TASK_STATUS_TODO,
} from './taskStatus'

let fallbackRequestSequence = 0

export const createTaskStatusRequestId = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  fallbackRequestSequence += 1
  return `task-status-${Date.now()}-${fallbackRequestSequence}`
}

export const normalizeTaskStatusResult = (value: unknown): number => {
  if (
    typeof value !== 'number'
    || !Number.isInteger(value)
    || value < TASK_STATUS_TODO
    || value > TASK_STATUS_DONE_EXCELLENT
  ) {
    throw new TypeError('任务状态响应不合法')
  }
  return value
}
