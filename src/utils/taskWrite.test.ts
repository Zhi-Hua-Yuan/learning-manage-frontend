import { describe, expect, it } from 'vitest'

import {
  createTaskStatusRequestId,
  normalizeTaskStatusChangeResult,
  normalizeTaskStatusResult,
} from './taskWrite'

describe('task write helpers', () => {
  it('creates a non-empty request id for each new status action', () => {
    const first = createTaskStatusRequestId()
    const second = createTaskStatusRequestId()

    expect(first).toEqual(expect.any(String))
    expect(first).not.toHaveLength(0)
    expect(second).not.toBe(first)
  })

  it('accepts only the supported task status range', () => {
    expect(normalizeTaskStatusResult(0)).toBe(0)
    expect(normalizeTaskStatusResult(3)).toBe(3)
    expect(() => normalizeTaskStatusResult(undefined)).toThrow(TypeError)
    expect(() => normalizeTaskStatusResult('2')).toThrow(TypeError)
    expect(() => normalizeTaskStatusResult(4)).toThrow(TypeError)
  })

  it('normalizes a complete status result without losing idempotency facts', () => {
    expect(normalizeTaskStatusChangeResult({
      changed: true,
      finalStatus: 2,
      completedAt: '2026-09-01T12:00:00',
      idempotentReplay: true,
    })).toEqual({
      changed: true,
      finalStatus: 2,
      completedAt: '2026-09-01T12:00:00',
      idempotentReplay: true,
    })
  })

  it('rejects partial or malformed status results', () => {
    expect(() => normalizeTaskStatusChangeResult(undefined)).toThrow(TypeError)
    expect(() => normalizeTaskStatusChangeResult({
      changed: true,
      finalStatus: 2,
      completedAt: null,
    })).toThrow(TypeError)
    expect(() => normalizeTaskStatusChangeResult({
      changed: true,
      finalStatus: 2,
      completedAt: 123 as never,
      idempotentReplay: false,
    })).toThrow(TypeError)
  })
})
