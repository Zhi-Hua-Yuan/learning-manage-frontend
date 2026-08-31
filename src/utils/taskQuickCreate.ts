import type { CreateTaskPayload } from '@/types/task'
import type { TeamRole } from '@/types/team'

export type TaskQuickCreateContext =
  | { kind: 'personal' }
  | { kind: 'team'; role: TeamRole }
  | { kind: 'unavailable' }

export interface TaskQuickCreateAccess {
  allowed: boolean
  deniedMessage: string | null
}

export interface BuildTaskQuickCreatePayloadOptions {
  title: string
  projectId: string
  milestoneId: string | null
  context: 'personal' | 'team'
  assigneeUserId: string | null
}

export const resolveTaskQuickCreateAccess = (
  context: TaskQuickCreateContext,
): TaskQuickCreateAccess => {
  if (context.kind === 'personal') {
    return { allowed: true, deniedMessage: null }
  }

  if (context.kind === 'team') {
    if (context.role === 'OWNER' || context.role === 'ADMIN') {
      return { allowed: true, deniedMessage: null }
    }
    if (context.role === 'MEMBER') {
      return { allowed: false, deniedMessage: '当前团队角色不能创建任务。' }
    }
    return { allowed: false, deniedMessage: '尚未确认团队创建权限。' }
  }

  return { allowed: false, deniedMessage: '当前项目上下文不可用。' }
}

export const buildTaskQuickCreatePayload = ({
  title,
  projectId,
  milestoneId,
  context,
  assigneeUserId,
}: BuildTaskQuickCreatePayloadOptions): CreateTaskPayload => {
  const payload: CreateTaskPayload = {
    title,
    projectId,
    priority: 0,
    dueDate: null,
    milestoneId: milestoneId || undefined,
  }

  if (context === 'team') {
    payload.assigneeUserId = assigneeUserId
  }

  return payload
}
