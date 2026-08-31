import { normalizeTaskWire } from '@/types/normalization'
import type { TaskModel } from '@/types/task'

/**
 * Converts untrusted task records at the API/cache boundary into the single
 * model consumed by task views. Invalid task records are ignored so one bad
 * record cannot make the whole task board unusable.
 */
export const normalizeTaskRecords = (records: unknown): TaskModel[] => {
  if (!Array.isArray(records)) return []

  return records.flatMap((record) => {
    const task = normalizeTaskWire(record as Parameters<typeof normalizeTaskWire>[0])
    return task ? [task] : []
  })
}

export const findTaskById = (tasks: readonly TaskModel[], taskId: string | null | undefined) => {
  if (!taskId) return null
  return tasks.find((task) => task.id === taskId) ?? null
}
