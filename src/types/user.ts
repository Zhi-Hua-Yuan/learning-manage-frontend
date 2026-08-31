import type { EntityId } from './common'

export type SystemRole = 'USER' | 'SYSTEM_ADMIN' | 'UNKNOWN'

export interface CurrentUserWire {
  id?: EntityId
  account?: string
  username?: string
  userRole?: unknown
  createTime?: string
}

export interface CurrentUserContext {
  id: string
  account: string
  username: string
  role: SystemRole
}
