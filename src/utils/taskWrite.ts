import {
  TASK_STATUS_DONE_EXCELLENT,
  TASK_STATUS_TODO,
} from './taskStatus'
import type { TaskStatusResult, TaskStatusResultWire } from '@/types/task'

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

export const normalizeTaskStatusChangeResult = (
  value: TaskStatusResultWire | null | undefined,
): TaskStatusResult => {
  if (!value || typeof value !== 'object') {
    throw new TypeError('任务状态响应不合法')
  }
  if (typeof value.changed !== 'boolean' || typeof value.idempotentReplay !== 'boolean') {
    throw new TypeError('任务状态响应不合法')
  }
  if (!Object.prototype.hasOwnProperty.call(value, 'completedAt')) {
    throw new TypeError('任务状态响应不合法')
  }
  if (value.completedAt !== null && typeof value.completedAt !== 'string') {
    throw new TypeError('任务状态响应不合法')
  }

  return {
    changed: value.changed,
    finalStatus: normalizeTaskStatusResult(value.finalStatus),
    completedAt: value.completedAt,
    idempotentReplay: value.idempotentReplay,
  }
}
