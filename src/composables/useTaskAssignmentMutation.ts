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
  | 'conflict-reconciling'
  | 'uncertain-reconciling'
  | 'reconfirm-required'
  | 'recovery-error'
  | 'committed-refresh-error'
  | 'blocked'

export type TaskAssignmentRecoverySource = 'CONFLICT' | 'UNCERTAIN'

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

const isUncertainError = (kind: ApiErrorKind) => (
  kind === 'NETWORK' || kind === 'SERVER' || kind === 'UNKNOWN'
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
  const recoverySource = ref<TaskAssignmentRecoverySource | null>(null)
  let requestVersion = 0

  const busy = computed(() => (
    phase.value === 'submitting'
    || phase.value === 'refreshing'
    || phase.value === 'conflict-reconciling'
    || phase.value === 'uncertain-reconciling'
  ))
  const blocked = computed(() => (
    phase.value === 'blocked'
    || phase.value === 'reconfirm-required'
    || phase.value === 'recovery-error'
    || phase.value === 'committed-refresh-error'
  ))

  const applyErrorPhase = (kind: ApiErrorKind) => {
    if (kind === 'VALIDATION') {
      phase.value = 'idle'
      recoverySource.value = null
      return
    }
    if (kind === 'CONFLICT') {
      phase.value = 'conflict-reconciling'
      recoverySource.value = 'CONFLICT'
      return
    }
    if (isUncertainError(kind)) {
      phase.value = 'uncertain-reconciling'
      recoverySource.value = 'UNCERTAIN'
      return
    }
    phase.value = 'blocked'
    recoverySource.value = null
  }

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
        phase.value = 'uncertain-reconciling'
        recoverySource.value = 'UNCERTAIN'
        errorMessage.value = '服务端返回的负责人结果无法确认，请重新加载任务后再操作。'
        return { kind: 'error', errorKind: 'UNKNOWN' }
      }

      phase.value = 'refreshing'
      return { kind: 'success', result }
    } catch (error) {
      if (version !== requestVersion) return { kind: 'stale' }

      const errorKind = classifyApiError(error)
      applyErrorPhase(errorKind)
      errorMessage.value = ERROR_MESSAGES[errorKind]
      return { kind: 'error', errorKind }
    }
  }

  const complete = () => {
    phase.value = 'idle'
    errorMessage.value = null
    recoverySource.value = null
  }

  const markCommittedRefreshError = (message = '负责人变更已提交，但最新任务状态加载失败，请重新加载后再操作。') => {
    phase.value = 'committed-refresh-error'
    errorMessage.value = message
    recoverySource.value = null
  }

  const beginCommittedRefreshRetry = () => {
    if (phase.value !== 'committed-refresh-error') return false
    phase.value = 'refreshing'
    errorMessage.value = null
    return true
  }

  const block = (message: string) => {
    phase.value = 'blocked'
    errorMessage.value = message
    recoverySource.value = null
  }

  const beginFailureRecovery = (source: TaskAssignmentRecoverySource) => {
    recoverySource.value = source
    phase.value = source === 'CONFLICT'
      ? 'conflict-reconciling'
      : 'uncertain-reconciling'
    errorMessage.value = null
  }

  const requireReconfirmation = (message = '任务负责人已刷新，请基于最新负责人再次确认。') => {
    if (!recoverySource.value) return false
    phase.value = 'reconfirm-required'
    errorMessage.value = message
    return true
  }

  const markRecoveryError = (message = '最新负责人状态加载失败，请重新核对后再操作。') => {
    if (!recoverySource.value) return false
    phase.value = 'recovery-error'
    errorMessage.value = message
    return true
  }

  const beginRecoveryRetry = () => {
    if (phase.value !== 'recovery-error' || !recoverySource.value) return false
    phase.value = recoverySource.value === 'CONFLICT'
      ? 'conflict-reconciling'
      : 'uncertain-reconciling'
    errorMessage.value = null
    return true
  }

  const beginExplicitReconfirm = () => {
    if (phase.value !== 'reconfirm-required') return false
    phase.value = 'idle'
    errorMessage.value = null
    recoverySource.value = null
    return true
  }

  const reset = () => {
    requestVersion += 1
    phase.value = 'idle'
    errorMessage.value = null
    recoverySource.value = null
  }

  return {
    phase: readonly(phase),
    errorMessage: readonly(errorMessage),
    recoverySource: readonly(recoverySource),
    busy,
    blocked,
    submit,
    complete,
    markCommittedRefreshError,
    beginCommittedRefreshRetry,
    block,
    beginFailureRecovery,
    requireReconfirmation,
    markRecoveryError,
    beginRecoveryRetry,
    beginExplicitReconfirm,
    reset,
  }
}
