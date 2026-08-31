import type { TaskModel } from '@/types/task'
import type { CurrentUserContext } from '@/types/user'
import type { TeamMemberContext } from '@/types/team'

export type TaskAssigneePresentationKind =
  | 'unassigned'
  | 'resolved'
  | 'unresolved'
  | 'inactive'

export interface TaskAssigneePresentation {
  kind: TaskAssigneePresentationKind
  userId: string | null
  label: string
  description: string | null
}

interface ResolveTaskAssigneePresentationOptions {
  task: TaskModel | null | undefined
  currentUser?: CurrentUserContext | null
  teamMembers?: TeamMemberContext[]
  teamMembersReady?: boolean
  isTeamProject?: boolean
}

const fallbackUserLabel = (userId: string) => `用户 #${userId}`

const normalizeUsername = (username: string | null | undefined) => {
  const value = typeof username === 'string' ? username.trim() : ''
  return value || null
}

export const resolveTaskAssigneePresentation = ({
  task,
  currentUser = null,
  teamMembers = [],
  teamMembersReady = false,
  isTeamProject = false,
}: ResolveTaskAssigneePresentationOptions): TaskAssigneePresentation => {
  const userId = task?.assigneeUserId ?? null
  if (!userId) {
    return {
      kind: 'unassigned',
      userId: null,
      label: '未分配',
      description: null,
    }
  }

  if (currentUser?.id === userId) {
    const username = normalizeUsername(currentUser.username)
    return {
      kind: 'resolved',
      userId,
      label: username || fallbackUserLabel(userId),
      description: username ? null : '当前用户未提供可显示的用户名。',
    }
  }

  const member = teamMembers.find((candidate) => candidate.userId === userId)
  if (member) {
    const username = normalizeUsername(member.username)
    return {
      kind: 'resolved',
      userId,
      label: username || fallbackUserLabel(userId),
      description: username ? null : '团队成员未提供可显示的用户名。',
    }
  }

  if (isTeamProject && teamMembersReady) {
    return {
      kind: 'inactive',
      userId,
      label: fallbackUserLabel(userId),
      description: '该负责人已不在当前团队成员列表中。',
    }
  }

  return {
    kind: 'unresolved',
    userId,
    label: fallbackUserLabel(userId),
    description: null,
  }
}
