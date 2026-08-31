export const TASK_ASSIGNMENT_REASON_MAX_LENGTH = 200

export type TaskAssignmentReasonResult =
  | {
      valid: true
      value: string | undefined
      length: number
    }
  | {
      valid: false
      code: 'TOO_LONG' | 'CONTROL_CHARACTER'
      message: string
    }

export type TaskAssignmentOperation = 'ASSIGN' | 'REASSIGN' | 'UNASSIGN' | 'NO_CHANGE'

const containsTaskAssignmentReasonControlCharacter = (value: string) => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) return true
  }
  return false
}

export const normalizeTaskAssignmentReason = (reason: string): TaskAssignmentReasonResult => {
  const value = reason.trim()
  if (!value) {
    return {
      valid: true,
      value: undefined,
      length: 0,
    }
  }

  if (value.length > TASK_ASSIGNMENT_REASON_MAX_LENGTH) {
    return {
      valid: false,
      code: 'TOO_LONG',
      message: `变更原因不能超过 ${TASK_ASSIGNMENT_REASON_MAX_LENGTH} 个字符。`,
    }
  }

  if (containsTaskAssignmentReasonControlCharacter(value)) {
    return {
      valid: false,
      code: 'CONTROL_CHARACTER',
      message: '变更原因不能包含控制字符。',
    }
  }

  return {
    valid: true,
    value,
    length: value.length,
  }
}

export const resolveTaskAssignmentOperation = (
  currentAssigneeUserId: string | null,
  targetAssigneeUserId: string | null,
): TaskAssignmentOperation => {
  if (currentAssigneeUserId === targetAssigneeUserId) return 'NO_CHANGE'
  if (currentAssigneeUserId === null) return 'ASSIGN'
  if (targetAssigneeUserId === null) return 'UNASSIGN'
  return 'REASSIGN'
}
