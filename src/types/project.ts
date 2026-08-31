import type { EntityId, NumericLike } from './common'

export type ProjectScope = 'PERSONAL' | 'TEAM' | 'UNKNOWN'

export interface ProjectWire {
  id?: EntityId
  userId?: EntityId
  teamId?: EntityId | null
  name?: string
  goal?: string
  scope?: unknown
  status?: unknown
  orderNo?: NumericLike
  icon?: string
  color?: string
  startDate?: string
  endDate?: string
  createTime?: string
  updateTime?: string
}

export interface ProjectContext {
  id: string
  ownerUserId: string
  teamId: string | null
  name: string
  goal: string
  scope: ProjectScope
  status: unknown
  orderNo: number | null
  icon: string | null
  color: string | null
  startDate: string | null
  endDate: string | null
  createTime: string | null
  updateTime: string | null
}
