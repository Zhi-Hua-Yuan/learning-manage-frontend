import { computed, readonly, ref } from 'vue'

import { fetchTaskAssignmentHistoryApi } from '@/api/task'
import { normalizeEntityId } from '@/types/normalization'
import type { TaskAssignmentHistory } from '@/types/task'
import {
  normalizeTaskAssignmentHistoryPage,
  TASK_ASSIGNMENT_HISTORY_DEFAULT_SIZE,
} from '@/utils/taskAssignmentHistory'
import { classifyApiError, type ApiErrorKind } from '@/utils/request'

export type TaskAssignmentHistoryPhase =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'loading-more'
  | 'refreshing'
  | 'error'
  | 'load-more-error'
  | 'forbidden'
  | 'not-found'

export type TaskAssignmentHistoryOutcome =
  | { kind: 'success' }
  | { kind: 'error'; errorKind: ApiErrorKind }
  | { kind: 'ignored' }
  | { kind: 'stale' }

const ERROR_MESSAGES: Record<ApiErrorKind, string> = {
  AUTHENTICATION_REQUIRED: '登录状态已失效，请重新登录。',
  PERMISSION_DENIED: '当前无权查看该任务的负责人历史。',
  CONFLICT: '负责人历史已发生变化，请重新加载。',
  VALIDATION: '负责人历史查询参数无效。',
  NOT_FOUND: '任务已不存在或当前不可访问。',
  SERVER: '负责人历史暂时无法加载，请稍后重试。',
  NETWORK: '网络异常，请检查网络后重试。',
  UNKNOWN: '负责人历史数据无法确认，请重新加载。',
}

const mergeUniqueRecords = (
  existing: readonly TaskAssignmentHistory[],
  incoming: readonly TaskAssignmentHistory[],
) => {
  const seenIds = new Set(existing.map((record) => record.id))
  return [
    ...existing,
    ...incoming.filter((record) => {
      if (seenIds.has(record.id)) return false
      seenIds.add(record.id)
      return true
    }),
  ]
}

export const useTaskAssignmentHistory = () => {
  const activeTaskId = ref<string | null>(null)
  const records = ref<TaskAssignmentHistory[]>([])
  const current = ref(0)
  const size = ref(TASK_ASSIGNMENT_HISTORY_DEFAULT_SIZE)
  const total = ref(0)
  const phase = ref<TaskAssignmentHistoryPhase>('idle')
  const errorKind = ref<ApiErrorKind | null>(null)
  const errorMessage = ref<string | null>(null)
  let requestRevision = 0

  const busy = computed(
    () =>
      phase.value === 'loading' || phase.value === 'loading-more' || phase.value === 'refreshing',
  )
  const hasMore = computed(() => current.value > 0 && current.value * size.value < total.value)

  const clearError = () => {
    errorKind.value = null
    errorMessage.value = null
  }

  const applyError = (kind: ApiErrorKind, mode: 'initial' | 'more' | 'refresh') => {
    errorKind.value = kind
    errorMessage.value = ERROR_MESSAGES[kind]

    if (kind === 'PERMISSION_DENIED') {
      records.value = []
      current.value = 0
      total.value = 0
      phase.value = 'forbidden'
      return
    }
    if (kind === 'NOT_FOUND') {
      records.value = []
      current.value = 0
      total.value = 0
      phase.value = 'not-found'
      return
    }
    phase.value = mode === 'more' ? 'load-more-error' : 'error'
  }

  const loadPage = async (
    requestedPage: number,
    mode: 'initial' | 'more' | 'refresh',
  ): Promise<TaskAssignmentHistoryOutcome> => {
    const taskId = activeTaskId.value
    if (!taskId || busy.value) return { kind: 'ignored' }

    const revision = ++requestRevision
    phase.value = mode === 'initial' ? 'loading' : mode === 'more' ? 'loading-more' : 'refreshing'
    clearError()

    try {
      const wirePage = await fetchTaskAssignmentHistoryApi(taskId, {
        current: requestedPage,
        size: size.value,
      })
      if (revision !== requestRevision || taskId !== activeTaskId.value) {
        return { kind: 'stale' }
      }

      const page = normalizeTaskAssignmentHistoryPage(wirePage, taskId, {
        expectedCurrent: requestedPage,
        expectedSize: size.value,
      })
      if (!page) {
        applyError('UNKNOWN', mode)
        return { kind: 'error', errorKind: 'UNKNOWN' }
      }

      records.value =
        mode === 'more' ? mergeUniqueRecords(records.value, page.records) : page.records
      current.value = page.current
      size.value = page.size
      total.value = page.total
      phase.value = 'ready'
      clearError()
      return { kind: 'success' }
    } catch (error) {
      if (revision !== requestRevision || taskId !== activeTaskId.value) {
        return { kind: 'stale' }
      }

      const kind = classifyApiError(error)
      applyError(kind, mode)
      return { kind: 'error', errorKind: kind }
    }
  }

  const open = async (rawTaskId: unknown): Promise<TaskAssignmentHistoryOutcome> => {
    const taskId = normalizeEntityId(rawTaskId)
    requestRevision += 1
    records.value = []
    current.value = 0
    size.value = TASK_ASSIGNMENT_HISTORY_DEFAULT_SIZE
    total.value = 0
    clearError()

    if (!taskId) {
      activeTaskId.value = null
      applyError('VALIDATION', 'initial')
      return { kind: 'error', errorKind: 'VALIDATION' }
    }

    activeTaskId.value = taskId
    phase.value = 'idle'
    return loadPage(1, 'initial')
  }

  const refresh = () => loadPage(1, 'refresh')

  const loadMore = () => {
    if (!hasMore.value) return Promise.resolve<TaskAssignmentHistoryOutcome>({ kind: 'ignored' })
    return loadPage(current.value + 1, 'more')
  }

  const reset = () => {
    requestRevision += 1
    activeTaskId.value = null
    records.value = []
    current.value = 0
    size.value = TASK_ASSIGNMENT_HISTORY_DEFAULT_SIZE
    total.value = 0
    phase.value = 'idle'
    clearError()
  }

  return {
    activeTaskId: readonly(activeTaskId),
    records: readonly(records),
    current: readonly(current),
    size: readonly(size),
    total: readonly(total),
    phase: readonly(phase),
    errorKind: readonly(errorKind),
    errorMessage: readonly(errorMessage),
    busy,
    hasMore,
    open,
    refresh,
    loadMore,
    reset,
  }
}
