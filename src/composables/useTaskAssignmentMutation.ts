import { computed, readonly, ref } from 'vue'

import { assignTaskApi } from '@/api/task'
import { normalizeTaskAssignmentResult } from '@/types/normalization'
import type {
  AssignTaskPayload,
  TaskAssignmentResult,
} from '@/types/task'
import {
  classifyApiError,
  type ApiErrorKind,
} from '@/utils/request'

export type TaskAssignmentMutationPhase =
  | 'idle'
  | 'submitting'
  | 'refreshing'
  | 'committed-refresh-error'
  | 'blocked'

export type TaskAssignmentMutationOutcome =
  | { kind: 'success'; result: TaskAssignmentResult }
  | { kind: 'error'; errorKind: ApiErrorKind }
  | { kind: 'ignored' }
  | { kind: 'stale' }

const ERROR_MESSAGES: Record<ApiErrorKind, string> = {
  AUTHENTICATION_REQUIRED: '登录状态已失效，请重新登录。',
  PERMISSION_DENIED: '负责人变更权限已失效，正在刷新最新任务权限。',
  CONFLICT: '任务负责人已发生变化，请重新核对最新状态后再确认。',
  VALIDATION: '负责人变更请求不合法，请检查负责人和变更原因。',
  NOT_FOUND: '任务已不存在或当前不可访问。',
  SERVER: '负责人状态暂时无法确认，请重新核对后再操作。',
  NETWORK: '网络异常，负责人状态可能已变化，请重新核对后再操作。',
  UNKNOWN: '负责人状态无法确认，请重新核对后再操作。',
}

const shouldBlockRetry = (kind: ApiErrorKind) => (
  kind !== 'VALIDATION'
)

const resultMatchesPayload = (
  result: TaskAssignmentResult,
  payload: AssignTaskPayload,
) => {
  const targetAssigneeUserId = payload.assigneeUserId === null
    ? null
    : String(payload.assigneeUserId)
  const expectedAssigneeUserId = payload.expectedAssigneeUserId === null
    ? null
    : String(payload.expectedAssigneeUserId)

  if (result.assigneeUserId !== targetAssigneeUserId) return false
  if (result.changed && result.previousAssigneeUserId !== expectedAssigneeUserId) return false
  return true
}

export const useTaskAssignmentMutation = () => {
  const phase = ref<TaskAssignmentMutationPhase>('idle')
  const errorMessage = ref<string | null>(null)
  let requestVersion = 0

  const busy = computed(() => (
    phase.value === 'submitting' || phase.value === 'refreshing'
  ))
  const blocked = computed(() => (
    phase.value === 'blocked' || phase.value === 'committed-refresh-error'
  ))

  const submit = async (payload: AssignTaskPayload): Promise<TaskAssignmentMutationOutcome> => {
    if (busy.value || blocked.value) return { kind: 'ignored' }

    const version = ++requestVersion
    phase.value = 'submitting'
    errorMessage.value = null

    try {
      const rawResult = await assignTaskApi(payload)
      if (version !== requestVersion) return { kind: 'stale' }

      const result = normalizeTaskAssignmentResult(rawResult, payload.taskId)
      if (!result || !resultMatchesPayload(result, payload)) {
        phase.value = 'blocked'
        errorMessage.value = '服务端返回的负责人结果无法确认，请重新加载任务后再操作。'
        return { kind: 'error', errorKind: 'UNKNOWN' }
      }

      phase.value = 'refreshing'
      return { kind: 'success', result }
    } catch (error) {
      if (version !== requestVersion) return { kind: 'stale' }

      const errorKind = classifyApiError(error)
      phase.value = shouldBlockRetry(errorKind) ? 'blocked' : 'idle'
      errorMessage.value = ERROR_MESSAGES[errorKind]
      return { kind: 'error', errorKind }
    }
  }

  const complete = () => {
    phase.value = 'idle'
    errorMessage.value = null
  }

  const markCommittedRefreshError = () => {
    phase.value = 'committed-refresh-error'
    errorMessage.value = '负责人变更已提交，但最新任务状态加载失败，请重新加载后再操作。'
  }

  const block = (message: string) => {
    phase.value = 'blocked'
    errorMessage.value = message
  }

  const reset = () => {
    requestVersion += 1
    phase.value = 'idle'
    errorMessage.value = null
  }

  return {
    phase: readonly(phase),
    errorMessage: readonly(errorMessage),
    busy,
    blocked,
    submit,
    complete,
    markCommittedRefreshError,
    block,
    reset,
  }
}
