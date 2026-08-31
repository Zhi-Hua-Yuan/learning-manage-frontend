import { describe, expect, it } from 'vitest'

import {
  createTaskStatusRequestId,
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
})
