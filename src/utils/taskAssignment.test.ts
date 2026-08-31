import { describe, expect, it } from 'vitest'

import {
  normalizeTaskAssignmentReason,
  resolveTaskAssignmentOperation,
} from './taskAssignment'

describe('task assignment reason contract', () => {
  it('trims optional reasons and omits blank values', () => {
    expect(normalizeTaskAssignmentReason('  handoff  ')).toEqual({
      valid: true,
      value: 'handoff',
      length: 7,
    })
    expect(normalizeTaskAssignmentReason('   ')).toEqual({
      valid: true,
      value: undefined,
      length: 0,
    })
  })

  it('accepts exactly 200 UTF-16 code units and rejects 201', () => {
    const accepted = 'a'.repeat(200)
    const rejected = 'a'.repeat(201)

    expect(normalizeTaskAssignmentReason(accepted)).toEqual({
      valid: true,
      value: accepted,
      length: 200,
    })
    expect(normalizeTaskAssignmentReason(rejected)).toEqual({
      valid: false,
      code: 'TOO_LONG',
      message: '变更原因不能超过 200 个字符。',
    })
  })

  it('counts emoji with the same UTF-16 length semantics as Java String.length', () => {
    const accepted = '🙂'.repeat(100)
    const rejected = `${accepted}🙂`

    expect(normalizeTaskAssignmentReason(accepted)).toMatchObject({
      valid: true,
      length: 200,
    })
    expect(normalizeTaskAssignmentReason(rejected)).toMatchObject({
      valid: false,
      code: 'TOO_LONG',
    })
  })

  it('rejects internal C0 and C1 control characters after trimming', () => {
    for (const reason of ['bad\nreason', 'bad\treason', `bad${String.fromCharCode(0x7f)}reason`, `bad${String.fromCharCode(0x85)}reason`]) {
      expect(normalizeTaskAssignmentReason(reason)).toEqual({
        valid: false,
        code: 'CONTROL_CHARACTER',
        message: '变更原因不能包含控制字符。',
      })
    }
  })

  it('keeps HTML-looking content as plain reason text', () => {
    expect(normalizeTaskAssignmentReason('<script>alert(1)</script>')).toEqual({
      valid: true,
      value: '<script>alert(1)</script>',
      length: 25,
    })
  })
})

describe('task assignment operation contract', () => {
  it.each([
    [null, '2', 'ASSIGN'],
    ['1', '2', 'REASSIGN'],
    ['1', null, 'UNASSIGN'],
    [null, null, 'NO_CHANGE'],
    ['1', '1', 'NO_CHANGE'],
  ] as const)('resolves %s -> %s as %s', (current, target, expected) => {
    expect(resolveTaskAssignmentOperation(current, target)).toBe(expected)
  })
})
