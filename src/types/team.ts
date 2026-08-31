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
