import type { EntityId, NumericLike, PageResult, WirePage } from './common'
import type { ProjectScope, ProjectWire } from './project'
import type { SharedWeeklyReview, SharedWeeklyReviewWire } from './review'
import type { AssignmentAction, AssignmentUserSummary, AssignmentUserSummaryWire, TaskAssignmentHistory, TaskAssignmentHistoryWire, TaskModel, TaskWire } from './task'
import { DENY_ALL_TASK_CAPABILITIES, type TaskCapabilities } from './task'
import type { TeamContext, TeamMemberContext, TeamMemberWire, TeamRole, TeamWire } from './team'
import type { CurrentUserContext, CurrentUserWire, SystemRole } from './user'

const ENTITY_ID_PATTERN = /^[1-9]\d*$/

export function normalizeEntityId(value: unknown): string | null {
  if (typeof value === 'string') {
    const normalized = value.trim()
    return ENTITY_ID_PATTERN.test(normalized) ? normalized : null
  }

  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
    return String(value)
  }

  return null
}

export function normalizeOptionalEntityId(value: EntityId | null | undefined): string | null {
  return value == null ? null : normalizeEntityId(value)
}

export function normalizeNumeric(value: unknown, fallback: number, minimum = 0): number {
  const candidate = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN
  return Number.isSafeInteger(candidate) && candidate >= minimum ? candidate : fallback
}

export function normalizePage<T>(page: WirePage<T> | null | undefined): PageResult<T> {
  return {
    records: Array.isArray(page?.records) ? page.records : [],
    current: normalizeNumeric(page?.current, 1, 1),
    size: normalizeNumeric(page?.size, 20, 1),
    total: normalizeNumeric(page?.total, 0, 0),
  }
}

export function normalizeTaskCapabilities(value: unknown): TaskCapabilities {
  if (!value || typeof value !== 'object') return DENY_ALL_TASK_CAPABILITIES

  const candidate = value as Record<string, unknown>
  const keys: Array<keyof TaskCapabilities> = [
    'canEditContent',
    'canChangeStatus',
    'canReorganize',
    'canAssign',
    'canDelete',
  ]

  if (!keys.every((key) => typeof candidate[key] === 'boolean')) {
    return DENY_ALL_TASK_CAPABILITIES
  }

  return {
    canEditContent: candidate.canEditContent as boolean,
    canChangeStatus: candidate.canChangeStatus as boolean,
    canReorganize: candidate.canReorganize as boolean,
    canAssign: candidate.canAssign as boolean,
    canDelete: candidate.canDelete as boolean,
  }
}

export function normalizeSystemRole(value: unknown): SystemRole {
  return value === 'USER' || value === 'SYSTEM_ADMIN' ? value : 'UNKNOWN'
}

export function normalizeCurrentUserWire(user: CurrentUserWire | null | undefined): CurrentUserContext | null {
  if (!user) return null
  const id = normalizeEntityId(user.id)
  if (!id) return null

  return {
    id,
    account: typeof user.account === 'string' ? user.account : '',
    username: typeof user.username === 'string' ? user.username : '',
    role: normalizeSystemRole(user.userRole),
  }
}

export function normalizeTeamRole(value: unknown): TeamRole {
  return value === 'OWNER' || value === 'ADMIN' || value === 'MEMBER' ? value : 'UNKNOWN'
}

export function normalizeTeamWire(team: TeamWire | null | undefined): TeamContext | null {
  if (!team) return null
  const id = normalizeEntityId(team.id)
  const ownerId = normalizeEntityId(team.ownerId)
  if (!id || !ownerId) return null

  return {
    id,
    ownerId,
    name: typeof team.name === 'string' ? team.name : '',
    description: typeof team.description === 'string' ? team.description : '',
  }
}

export function normalizeTeamMemberWire(member: TeamMemberWire | null | undefined): TeamMemberContext | null {
  if (!member) return null
  const teamId = normalizeEntityId(member.teamId)
  const userId = normalizeEntityId(member.userId)
  if (!teamId || !userId) return null

  return {
    teamId,
    userId,
    username: typeof member.username === 'string' ? member.username : '',
    role: normalizeTeamRole(member.role),
    joinedAt: typeof member.joinedAt === 'string' ? member.joinedAt : null,
  }
}

export function normalizeProjectScope(value: unknown): ProjectScope {
  return value === 'PERSONAL' || value === 'TEAM' ? value : 'UNKNOWN'
}

export function normalizeTaskWire(task: TaskWire | null | undefined): TaskModel | null {
  if (!task) return null
  const id = normalizeEntityId(task.id)
  const projectId = normalizeEntityId(task.projectId)
  const milestoneId = normalizeOptionalEntityId(task.milestoneId)
  const createdByUserId = normalizeEntityId(task.createdByUserId)
  const assigneeUserId = normalizeOptionalEntityId(task.assigneeUserId)
  const assignedByUserId = normalizeOptionalEntityId(task.assignedByUserId)

  if (!id || !projectId || !createdByUserId
    || (task.milestoneId != null && !milestoneId)
    || (task.assigneeUserId != null && !assigneeUserId)
    || (task.assignedByUserId != null && !assignedByUserId)) {
    return null
  }

  return {
    id,
    projectId,
    milestoneId,
    createdByUserId,
    assigneeUserId,
    assignedByUserId,
    assignedAt: typeof task.assignedAt === 'string' ? task.assignedAt : null,
    title: typeof task.title === 'string' ? task.title : '',
    description: typeof task.description === 'string' ? task.description : null,
    status: task.status,
    priority: task.priority,
    dueDate: typeof task.dueDate === 'string' ? task.dueDate : null,
    completedAt: typeof task.completedAt === 'string' ? task.completedAt : null,
    createTime: typeof task.createTime === 'string' ? task.createTime : null,
    updateTime: typeof task.updateTime === 'string' ? task.updateTime : null,
    capabilities: normalizeTaskCapabilities(task.capabilities),
  }
}

export function normalizeReviewVisibilityScope(value: unknown) {
  return value === 'PRIVATE' || value === 'TEAM' ? value : 'UNKNOWN'
}

export function normalizeAssignmentAction(value: unknown): AssignmentAction | 'UNKNOWN' {
  const actions: AssignmentAction[] = [
    'INITIAL_ASSIGN',
    'ASSIGN',
    'REASSIGN',
    'UNASSIGN',
    'MEMBER_LEFT',
    'MEMBER_REMOVED',
  ]
  return typeof value === 'string' && actions.includes(value as AssignmentAction)
    ? value as AssignmentAction
    : 'UNKNOWN'
}

export function normalizeAssignmentUserSummary(summary: AssignmentUserSummaryWire | null | undefined): AssignmentUserSummary {
  if (!summary) return { userId: null, username: null }
  return {
    userId: normalizeOptionalEntityId(summary.userId),
    username: typeof summary.username === 'string' && summary.username.trim() ? summary.username : null,
  }
}

export function normalizeTaskAssignmentHistory(history: TaskAssignmentHistoryWire | null | undefined): TaskAssignmentHistory | null {
  if (!history) return null
  const id = normalizeEntityId(history.id)
  const taskId = normalizeEntityId(history.taskId)
  if (!id || !taskId) return null

  return {
    id,
    taskId,
    action: normalizeAssignmentAction(history.action),
    fromAssignee: normalizeAssignmentUserSummary(history.fromAssignee),
    toAssignee: normalizeAssignmentUserSummary(history.toAssignee),
    assignedBy: normalizeAssignmentUserSummary(history.assignedBy),
    reason: typeof history.reason === 'string' ? history.reason : null,
    createTime: typeof history.createTime === 'string' ? history.createTime : null,
  }
}

export function normalizeSharedWeeklyReviewWire(review: SharedWeeklyReviewWire | null | undefined): SharedWeeklyReview | null {
  if (!review) return null
  const id = normalizeEntityId(review.id)
  if (!id) return null
  const focusProject = review.focusProject
    ? {
        id: normalizeOptionalEntityId(review.focusProject.id),
        name: typeof review.focusProject.name === 'string' ? review.focusProject.name : null,
      }
    : null

  return {
    id,
    author: {
      id: normalizeOptionalEntityId(review.author?.id),
      username: typeof review.author?.username === 'string' ? review.author.username : null,
    },
    year: typeof review.year === 'number' ? review.year : 0,
    weekNo: typeof review.weekNo === 'number' ? review.weekNo : 0,
    startDate: typeof review.startDate === 'string' ? review.startDate : null,
    endDate: typeof review.endDate === 'string' ? review.endDate : null,
    focusProject,
    sharedSummary: typeof review.sharedSummary === 'string' ? review.sharedSummary : null,
    createTime: typeof review.createTime === 'string' ? review.createTime : null,
    updateTime: typeof review.updateTime === 'string' ? review.updateTime : null,
  }
}

export function normalizeProjectWire(project: ProjectWire | null | undefined) {
  if (!project) return null
  const id = normalizeEntityId(project.id)
  const ownerUserId = normalizeEntityId(project.userId)
  const teamId = normalizeOptionalEntityId(project.teamId)
  // ProjectVo currently has no scope field; teamId is the authoritative shape
  // discriminator until a dedicated scope is added to the API contract.
  const scope = normalizeProjectScope(project.scope ?? (teamId ? 'TEAM' : 'PERSONAL'))

  if (!id || !ownerUserId || scope === 'UNKNOWN' || (scope === 'TEAM' && !teamId) || (scope === 'PERSONAL' && teamId)) {
    return null
  }

  return {
    id,
    ownerUserId,
    teamId,
    name: typeof project.name === 'string' ? project.name : '',
    goal: typeof project.goal === 'string' ? project.goal : '',
    scope,
    status: project.status,
    orderNo: normalizeNumericLike(project.orderNo),
    icon: typeof project.icon === 'string' ? project.icon : null,
    color: typeof project.color === 'string' ? project.color : null,
    startDate: typeof project.startDate === 'string' ? project.startDate : null,
    endDate: typeof project.endDate === 'string' ? project.endDate : null,
    createTime: typeof project.createTime === 'string' ? project.createTime : null,
    updateTime: typeof project.updateTime === 'string' ? project.updateTime : null,
  }
}

function normalizeNumericLike(value: NumericLike | undefined): number | null {
  if (value == null) return null
  const normalized = normalizeNumeric(value, -1, 0)
  return normalized < 0 ? null : normalized
}
