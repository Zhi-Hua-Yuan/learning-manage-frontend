export type EntityId = string | number

export type NormalizedId = string

export type NumericLike = string | number

export interface WirePage<T> {
  records?: T[]
  current?: NumericLike
  size?: NumericLike
  total?: NumericLike
}

export interface PageResult<T> {
  records: T[]
  current: number
  size: number
  total: number
}
