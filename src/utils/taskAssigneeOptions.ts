import type { TeamMemberContext, TeamRole } from '@/types/team'
import type { CurrentUserContext } from '@/types/user'

export interface TaskAssigneeOption {
  value: string | null
  label: string
  description: string | null
  role: TeamRole | null
  disabled: boolean
  kind: 'unassigned' | 'member' | 'current-user'
}

export const UNASSIGNED_TASK_OPTION: Readonly<TaskAssigneeOption> = Object.freeze({
  value: null,
  label: '未分配',
  description: '暂不指定任务负责人',
  role: null,
  disabled: false,
  kind: 'unassigned',
})

const ROLE_ORDER: Record<TeamRole, number> = {
  OWNER: 0,
  ADMIN: 1,
  MEMBER: 2,
  UNKNOWN: 3,
}

const normalizeId = (value: unknown) => {
  if (typeof value === 'string') {
    const normalized = value.trim()
    return normalized || null
  }
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
    return String(value)
  }
  return null
}

const normalizeUsername = (value: unknown) => {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized || null
}

const fallbackUserLabel = (userId: string) => `用户 #${userId}`

export const getTaskAssigneeRoleLabel = (role: TeamRole | null) => {
  if (role === 'OWNER') return '所有者'
  if (role === 'ADMIN') return '管理员'
  if (role === 'MEMBER' || role === 'UNKNOWN') return '成员'
  return null
}

const compareOptions = (left: TaskAssigneeOption, right: TaskAssigneeOption) => {
  const roleOrder = ROLE_ORDER[left.role ?? 'UNKNOWN'] - ROLE_ORDER[right.role ?? 'UNKNOWN']
  if (roleOrder !== 0) return roleOrder

  const labelOrder = left.label.localeCompare(right.label, 'zh-CN')
  if (labelOrder !== 0) return labelOrder
  return (left.value ?? '').localeCompare(right.value ?? '')
}

export const buildTeamTaskAssigneeOptions = (
  teamId: string,
  members: readonly TeamMemberContext[],
): TaskAssigneeOption[] => {
  const normalizedTeamId = normalizeId(teamId)
  const seen = new Set<string>()
  const options: TaskAssigneeOption[] = []

  for (const member of members) {
    const memberTeamId = normalizeId(member.teamId)
    const userId = normalizeId(member.userId)
    if (!normalizedTeamId || memberTeamId !== normalizedTeamId || !userId || seen.has(userId)) continue
    seen.add(userId)

    const username = normalizeUsername(member.username)
    options.push({
      value: userId,
      label: username || fallbackUserLabel(userId),
      description: getTaskAssigneeRoleLabel(member.role),
      role: member.role,
      disabled: false,
      kind: 'member',
    })
  }

  options.sort(compareOptions)
  return [UNASSIGNED_TASK_OPTION, ...options]
}

export const buildPersonalTaskAssigneeOptions = (
  currentUser: CurrentUserContext | null | undefined,
): TaskAssigneeOption[] => {
  const userId = normalizeId(currentUser?.id)
  if (!userId) return []

  const username = normalizeUsername(currentUser?.username)
  return [{
    value: userId,
    label: username || fallbackUserLabel(userId),
    description: '当前用户',
    role: null,
    disabled: false,
    kind: 'current-user',
  }]
}
