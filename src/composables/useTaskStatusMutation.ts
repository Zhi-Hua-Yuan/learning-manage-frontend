import { reactive } from 'vue'

import { changeTaskStatusApi } from '@/api/task'
import type { ApiErrorKind } from '@/utils/request'
import { classifyApiError } from '@/utils/request'
import {
  createTaskStatusRequestId,
  normalizeTaskStatusChangeResult,
} from '@/utils/taskWrite'
import type { TaskStatusResult } from '@/types/task'

export type TaskStatusMutationPhase =
  | 'submitting'
  | 'uncertain'
  | 'reconciling'
  | 'refreshing'
  | 'fact-refresh-error'
  | 'committed-refresh-error'

export interface TaskStatusCommand {
  taskId: string
  projectId: string
  contextKey: string
  expectedStatus: number
  targetStatus: number
  clientRequestId: string
  previousCompletedAt: string | null
}

export interface TaskStatusMutationState {
  phase: TaskStatusMutationPhase
  command: TaskStatusCommand
  result: TaskStatusResult | null
  errorMessage: string | null
  sideEffectsApplied: boolean
}

export type TaskStatusMutationOutcome =
  | { kind: 'success'; state: TaskStatusMutationState; result: TaskStatusResult }
  | { kind: 'error'; state: TaskStatusMutationState; errorKind: ApiErrorKind }
  | { kind: 'ignored'; state: TaskStatusMutationState }
  | { kind: 'stale' }

export interface NewTaskStatusCommandInput {
  taskId: string
  projectId: string
  contextKey: string
  expectedStatus: number
  targetStatus: number
  previousCompletedAt: string | null
}

const UNCERTAIN_ERROR_KINDS: ReadonlySet<ApiErrorKind> = new Set([
  'NETWORK',
  'SERVER',
  'UNKNOWN',
])

const ERROR_MESSAGES: Record<ApiErrorKind, string> = {
  AUTHENTICATION_REQUIRED: '登录状态已失效，请重新登录。',
  PERMISSION_DENIED: '任务状态权限已发生变化，正在刷新最新任务权限。',
  CONFLICT: '任务状态已被其他操作修改，正在刷新最新状态。',
  VALIDATION: '状态变更请求不合法，请基于最新任务重新操作。',
  NOT_FOUND: '任务已不存在或当前不可访问。',
  SERVER: '服务暂时不可用，任务状态结果尚未确认。',
  NETWORK: '网络异常，任务状态结果尚未确认。',
  UNKNOWN: '任务状态结果无法确认。',
}

export const useTaskStatusMutation = () => {
  const states = reactive(new Map<string, TaskStatusMutationState>())

  const getState = (taskId: string) => states.get(taskId) ?? null
  const isBlocked = (taskId: string) => states.has(taskId)

  const run = async (state: TaskStatusMutationState): Promise<TaskStatusMutationOutcome> => {
    const { command } = state
    state.phase = 'submitting'
    state.errorMessage = null

    try {
      const rawResult = await changeTaskStatusApi({
        taskId: command.taskId,
        targetStatus: command.targetStatus,
        expectedStatus: command.expectedStatus,
        clientRequestId: command.clientRequestId,
      })
      if (states.get(command.taskId) !== state) return { kind: 'stale' }

      let result: TaskStatusResult
      try {
        result = normalizeTaskStatusChangeResult(rawResult)
      } catch {
        state.phase = 'uncertain'
        state.errorMessage = '服务端返回的状态结果无法确认，请重试原请求或刷新任务事实。'
        return { kind: 'error', state, errorKind: 'UNKNOWN' }
      }

      if (result.finalStatus !== command.targetStatus) {
        state.phase = 'uncertain'
        state.errorMessage = '服务端返回的最终状态与目标不一致，请刷新任务事实。'
        return { kind: 'error', state, errorKind: 'UNKNOWN' }
      }

      state.phase = 'refreshing'
      state.result = result
      return { kind: 'success', state, result }
    } catch (error) {
      if (states.get(command.taskId) !== state) return { kind: 'stale' }

      const errorKind = classifyApiError(error)
      state.phase = UNCERTAIN_ERROR_KINDS.has(errorKind) ? 'uncertain' : 'reconciling'
      state.errorMessage = ERROR_MESSAGES[errorKind]
      return { kind: 'error', state, errorKind }
    }
  }

  const submitNew = async (
    input: NewTaskStatusCommandInput,
  ): Promise<TaskStatusMutationOutcome> => {
    const existing = states.get(input.taskId)
    if (existing) return { kind: 'ignored', state: existing }

    const state = reactive<TaskStatusMutationState>({
      phase: 'submitting',
      command: {
        ...input,
        clientRequestId: createTaskStatusRequestId(),
      },
      result: null,
      errorMessage: null,
      sideEffectsApplied: false,
    })
    states.set(input.taskId, state)
    return run(state)
  }

  const retryUncertain = async (taskId: string): Promise<TaskStatusMutationOutcome> => {
    const state = states.get(taskId)
    if (!state) return { kind: 'stale' }
    if (state.phase !== 'uncertain') return { kind: 'ignored', state }
    return run(state)
  }

  const beginFactReconciliation = (taskId: string) => {
    const state = states.get(taskId)
    if (!state || state.phase !== 'uncertain') return null
    state.phase = 'reconciling'
    state.errorMessage = null
    return state
  }

  const restoreUncertain = (taskId: string, message: string) => {
    const state = states.get(taskId)
    if (!state) return false
    state.phase = 'uncertain'
    state.errorMessage = message
    return true
  }

  const markCommittedRefreshError = (taskId: string, message: string) => {
    const state = states.get(taskId)
    if (!state || !state.result) return false
    state.phase = 'committed-refresh-error'
    state.errorMessage = message
    return true
  }

  const markFactRefreshError = (taskId: string, message: string) => {
    const state = states.get(taskId)
    if (!state) return false
    state.phase = state.result ? 'committed-refresh-error' : 'fact-refresh-error'
    state.errorMessage = message
    return true
  }

  const beginFactRefreshRetry = (taskId: string) => {
    const state = states.get(taskId)
    if (
      !state
      || (state.phase !== 'fact-refresh-error' && state.phase !== 'committed-refresh-error')
    ) return null
    state.phase = 'refreshing'
    state.errorMessage = null
    return state
  }

  const claimChangedSideEffect = (taskId: string) => {
    const state = states.get(taskId)
    if (!state?.result?.changed || state.sideEffectsApplied) return false
    state.sideEffectsApplied = true
    return true
  }

  const complete = (taskId: string) => states.delete(taskId)
  const resetTask = (taskId: string) => states.delete(taskId)
  const resetAll = () => states.clear()

  return {
    states,
    getState,
    isBlocked,
    submitNew,
    retryUncertain,
    beginFactReconciliation,
    restoreUncertain,
    markCommittedRefreshError,
    markFactRefreshError,
    beginFactRefreshRetry,
    claimChangedSideEffect,
    complete,
    resetTask,
    resetAll,
  }
}
