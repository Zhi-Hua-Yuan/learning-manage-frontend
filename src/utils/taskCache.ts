import { listStorageKeys, readCache, removeCache, removeRawStorage, writeCache } from '@/utils/cacheClient'
import {
  getTaskListAllCacheEntry,
  getTaskListCacheEntry,
  TASK_LIST_CACHE_PREFIX,
} from '@/utils/cacheRegistry'
import type { TaskModel } from '@/types/task'

export const TASK_LIST_CACHE_TTL_MS = 5 * 60 * 1000

const normalizeTaskArray = (value: unknown): TaskModel[] | null => (Array.isArray(value) ? (value as TaskModel[]) : null)

const upsertTaskList = (tasks: TaskModel[], task: TaskModel) =>
  tasks.some((item) => item.id === task.id)
    ? tasks.map((item) => (item.id === task.id ? { ...item, ...task } : item))
    : [...tasks, task]

export const readTaskCache = (projectId: string, maxAgeMs = TASK_LIST_CACHE_TTL_MS): TaskModel[] | null => {
  if (!projectId) return null
  const entry = getTaskListCacheEntry(projectId)
  const cached = readCache<TaskModel[]>(entry, {
    maxAgeMs,
    allowLegacyVersionless: true,
  })
  return normalizeTaskArray(cached)
}

export const writeTaskCache = (projectId: string, tasks: TaskModel[]) => {
  if (!projectId) return
  writeCache(getTaskListCacheEntry(projectId), tasks)
}

export const clearTaskCache = (projectId?: string) => {
  if (projectId === undefined) {
    listStorageKeys()
      .filter((key) => key.startsWith(TASK_LIST_CACHE_PREFIX))
      .forEach((key) => removeRawStorage(key))
    removeCache(getTaskListAllCacheEntry())
    return
  }

  removeCache(getTaskListCacheEntry(projectId))
}

export const readAllProjectsTaskCache = (maxAgeMs = TASK_LIST_CACHE_TTL_MS): Record<string, TaskModel[]> | null => {
  const cached = readCache<Record<string, TaskModel[]>>(getTaskListAllCacheEntry(), {
    maxAgeMs,
    allowLegacyVersionless: true,
  })
  if (!cached || typeof cached !== 'object') return null
  return cached
}

export const writeAllProjectsTaskCache = (data: Record<string, TaskModel[]>) => {
  writeCache(getTaskListAllCacheEntry(), data)
}

export const upsertTaskInCaches = (task: TaskModel) => {
  const projectId = String(task.projectId || '')
  if (!projectId) return

  const nextProjectTasks = upsertTaskList(readTaskCache(projectId, Number.POSITIVE_INFINITY) || [], task)
  writeTaskCache(projectId, nextProjectTasks)

  const cachedAllProjectsTasks = readAllProjectsTaskCache(Number.POSITIVE_INFINITY) || {}
  const currentProjectTasks = Array.isArray(cachedAllProjectsTasks[projectId]) ? cachedAllProjectsTasks[projectId]! : []
  writeAllProjectsTaskCache({
    ...cachedAllProjectsTasks,
    [projectId]: upsertTaskList(currentProjectTasks, task),
  })
}

export const removeTaskFromCaches = (task: Pick<TaskModel, 'id' | 'projectId'>) => {
  const projectId = String(task.projectId || '')
  if (!projectId) return

  const nextProjectTasks = (readTaskCache(projectId, Number.POSITIVE_INFINITY) || []).filter((item) => item.id !== task.id)
  writeTaskCache(projectId, nextProjectTasks)

  const cachedAllProjectsTasks = readAllProjectsTaskCache(Number.POSITIVE_INFINITY) || {}
  const currentProjectTasks = Array.isArray(cachedAllProjectsTasks[projectId]) ? cachedAllProjectsTasks[projectId]! : []
  writeAllProjectsTaskCache({
    ...cachedAllProjectsTasks,
    [projectId]: currentProjectTasks.filter((item) => item.id !== task.id),
  })
}

export const writeAggregateTaskCacheFromRecords = (records: TaskModel[]) => {
  const nextCache: Record<string, TaskModel[]> = {}
  records.forEach((task) => {
    const projectId = String(task.projectId || '')
    if (!projectId) return
    if (!nextCache[projectId]) {
      nextCache[projectId] = []
    }
    nextCache[projectId]!.push(task)
  })
  writeAllProjectsTaskCache(nextCache)
}

export const syncAggregateTaskCacheByProject = (projectId: string, tasks: TaskModel[]) => {
  if (!projectId) return
  const cachedAllProjectsTasks = readAllProjectsTaskCache(Number.POSITIVE_INFINITY) || {}
  writeAllProjectsTaskCache({
    ...cachedAllProjectsTasks,
    [projectId]: tasks,
  })
}

export const removeProjectTaskCaches = (projectId: string) => {
  if (!projectId) return

  clearTaskCache(projectId)

  const cachedAllProjectsTasks = readAllProjectsTaskCache(Number.POSITIVE_INFINITY)
  if (!cachedAllProjectsTasks || !(projectId in cachedAllProjectsTasks)) return

  const nextCache = { ...cachedAllProjectsTasks }
  delete nextCache[projectId]
  writeAllProjectsTaskCache(nextCache)
}
