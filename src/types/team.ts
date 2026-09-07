import type { EntityId } from './common'

export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'UNKNOWN'

export interface TeamWire {
  id?: EntityId
  ownerId?: EntityId
  name?: string
  description?: string
  role?: unknown
  createTime?: string
  updateTime?: string
}

export interface TeamContext {
  id: string
  ownerId: string
  name: string
  description: string
  role: TeamRole
}

export interface TeamMemberWire {
  userId?: EntityId
  username?: string
  role?: unknown
  joinTime?: string
}

export interface TeamMemberContext {
  teamId: string
  userId: string
  username: string
  role: TeamRole
  joinedAt: string | null
}

export interface TeamCreateResultWire {
  teamId?: EntityId
  inviteCode?: string
}

export interface TeamInviteWire {
  teamId?: EntityId
  inviteCode?: string
}

export interface TeamMembershipTerminationWire {
  teamId?: EntityId
  memberUserId?: EntityId
  action?: string
  unassignedTaskCount?: number
  terminatedAt?: string
}

export interface TeamOwnershipTransferWire {
  teamId?: EntityId
  previousOwnerUserId?: EntityId
  newOwnerUserId?: EntityId
  transferredAt?: string
}

export interface TeamDissolutionCheckWire {
  teamId?: EntityId
  canDissolve?: boolean
  activeProjectCount?: number
  sharedReviewCount?: number
}

export interface TeamDissolutionWire {
  teamId?: EntityId
  dissolvedAt?: string
  removedMemberCount?: number
}
