import { computed, readonly, ref } from 'vue'

import {
  normalizeTaskAssignmentReason,
  resolveTaskAssignmentOperation,
} from '@/utils/taskAssignment'

export interface OpenTaskAssignmentDraftInput {
  taskId: string
  projectId: string
  contextKey: string
  currentAssigneeUserId: string | null
}

export interface TaskAssignmentDraft {
  taskId: string
  projectId: string
  contextKey: string
  expectedAssigneeUserId: string | null
  targetAssigneeUserId: string | null
  reason: string
}

export const useTaskAssignmentDraft = () => {
  const draft = ref<TaskAssignmentDraft | null>(null)

  const operation = computed(() => {
    const currentDraft = draft.value
    return currentDraft
      ? resolveTaskAssignmentOperation(
          currentDraft.expectedAssigneeUserId,
          currentDraft.targetAssigneeUserId,
        )
      : 'NO_CHANGE'
  })
  const reasonResult = computed(() => normalizeTaskAssignmentReason(draft.value?.reason ?? ''))
  const canConfirm = computed(() => operation.value !== 'NO_CHANGE' && reasonResult.value.valid)

  const open = (input: OpenTaskAssignmentDraftInput) => {
    draft.value = {
      taskId: input.taskId,
      projectId: input.projectId,
      contextKey: input.contextKey,
      expectedAssigneeUserId: input.currentAssigneeUserId,
      targetAssigneeUserId: input.currentAssigneeUserId,
      reason: '',
    }
  }

  const close = () => {
    draft.value = null
  }

  const setTargetAssigneeUserId = (value: string | null) => {
    if (!draft.value) return
    draft.value.targetAssigneeUserId = value
  }

  const setReason = (value: string) => {
    if (!draft.value) return
    draft.value.reason = value
  }

  const invalidateUnlessCurrent = (contextKey: string, taskId: string | null) => {
    const currentDraft = draft.value
    if (!currentDraft) return false
    if (currentDraft.contextKey === contextKey && currentDraft.taskId === taskId) return false
    close()
    return true
  }

  return {
    draft: readonly(draft),
    operation,
    reasonResult,
    canConfirm,
    open,
    close,
    setTargetAssigneeUserId,
    setReason,
    invalidateUnlessCurrent,
  }
}
