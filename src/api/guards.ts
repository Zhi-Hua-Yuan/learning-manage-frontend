import type { EntityId } from '@/types/common'
import { normalizeEntityId } from '@/types/normalization'

export function requireEntityId(value: unknown, fieldName: string): string {
  const normalized = normalizeEntityId(value as EntityId)
  if (!normalized) {
    throw new TypeError(`${fieldName} must be a positive safe integer ID`)
  }
  return normalized
}

export function omitUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>
}
