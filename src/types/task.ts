import type { EntityId, NumericLike } from './common'

export interface TaskCapabilities {
  canEditContent: boolean
  canChangeStatus: boolean
  canReorganize: boolean
  canAssign: boolean
  canDelete: boolean
}

export const DENY_ALL_TASK_CAPABILITIES: Readonly<TaskCapabilities> = Object.freeze({
  canEditContent: false,
  canChangeStatus: false,
  canReorganize: false,
  canAssign: false,
  canDelete: false,
})

export interface TaskWire {
  id?: EntityId
  projectId?: EntityId
  milestoneId?: EntityId | null
  createdByUserId?: EntityId
  assigneeUserId?: EntityId | null
  assignedByUserId?: EntityId | null
  assignedAt?: string | null
  title?: string
  description?: string | null
  status?: unknown
  priority?: unknown
  dueDate?: string | null
  completedAt?: string | null
  createTime?: string
  updateTime?: string
  capabilities?: unknown
}

export interface TaskModel {
  id: string
  projectId: string
  milestoneId: string | null
  createdByUserId: string
  assigneeUserId: string | null
  assignedByUserId: string | null
  assignedAt: string | null
  title: string
  description: string | null
  status: number
  priority: number
  dueDate: string | null
  completedAt: string | null
  createTime: string | null
  updateTime: string | null
  capabilities: TaskCapabilities
}

export interface CreateTaskPayload {
  title: string
  projectId: EntityId
  description?: string
  priority?: number
  dueDate?: string | null
  milestoneId?: EntityId | null
  assigneeUserId?: EntityId | null
}

export interface UpdateTaskContentPayload {
  id: EntityId
  title?: string
  description?: string
  priority?: number
  dueDate?: string | null
  milestoneId?: EntityId | null
}

export interface AssignTaskPayload {
  taskId: EntityId
  assigneeUserId: EntityId | null
  expectedAssigneeUserId: EntityId | null
  reason?: string
}

export interface TaskAssignmentResultWire {
  taskId?: EntityId
  changed?: boolean
  previousAssigneeUserId?: EntityId | null
  assigneeUserId?: EntityId | null
  assignedByUserId?: EntityId | null
  assignedAt?: string | null
}

export interface TaskAssignmentResult {
  taskId: string
  changed: boolean
  previousAssigneeUserId: string | null
  assigneeUserId: string | null
  assignedByUserId: string | null
  assignedAt: string | null
}

export interface ChangeTaskStatusPayload {
  taskId: EntityId
  targetStatus: number
  clientRequestId: string
  expectedStatus: number
}

export interface TaskStatusResultWire {
  changed?: boolean
  finalStatus?: unknown
  completedAt?: string | null
  idempotentReplay?: boolean
}

export interface TaskStatusResult {
  changed: boolean
  finalStatus: number
  completedAt: string | null
  idempotentReplay: boolean
}

export type AssignmentAction =
  | 'INITIAL_ASSIGN'
  | 'ASSIGN'
  | 'REASSIGN'
  | 'UNASSIGN'
  | 'MEMBER_LEFT'
  | 'MEMBER_REMOVED'

export interface AssignmentUserSummaryWire {
  userId?: EntityId
  username?: string | null
}

export interface TaskAssignmentHistoryWire {
  id?: EntityId
  taskId?: EntityId
  action?: unknown
  fromAssignee?: AssignmentUserSummaryWire | null
  toAssignee?: AssignmentUserSummaryWire | null
  assignedBy?: AssignmentUserSummaryWire | null
  reason?: string | null
  createTime?: string
}

export interface AssignmentUserSummary {
  userId: string | null
  username: string | null
}

export interface TaskAssignmentHistory {
  id: string
  taskId: string
  action: AssignmentAction | 'UNKNOWN'
  fromAssignee: AssignmentUserSummary
  toAssignee: AssignmentUserSummary
  assignedBy: AssignmentUserSummary
  reason: string | null
  createTime: string | null
}

export interface TaskAssignmentHistoryPageWire {
  records?: TaskAssignmentHistoryWire[]
  current?: NumericLike
  size?: NumericLike
  total?: NumericLike
}
