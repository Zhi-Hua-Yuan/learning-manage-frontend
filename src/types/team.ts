import type { EntityId } from './common'

export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'UNKNOWN'

export interface TeamWire {
  id?: EntityId
  ownerId?: EntityId
  name?: string
  description?: string
  createTime?: string
  updateTime?: string
}

export interface TeamContext {
  id: string
  ownerId: string
  name: string
  description: string
}

export interface TeamMemberWire {
  teamId?: EntityId
  userId?: EntityId
  username?: string
  role?: unknown
  joinedAt?: string
}

export interface TeamMemberContext {
  teamId: string
  userId: string
  username: string
  role: TeamRole
  joinedAt: string | null
}
