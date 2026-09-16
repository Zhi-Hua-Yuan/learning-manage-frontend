import { describe, expect, it } from 'vitest'

import { normalizeSourceDataVersion, parseAgentDraftPayload } from '@/utils/agentDraftPayload'

const payload = (sourceDataVersion: unknown) => JSON.stringify({
  sourceRunId: 'run-1',
  reportType: 'PROJECT_RISK',
  sourceDataVersion,
  projectId: '2098698814079639554',
  managerSummary: '项目风险较低。',
})

describe('Agent draft payload parsing', () => {
  it('accepts a serialized Long data version without converting it to number', () => {
    const result = parseAgentDraftPayload(payload('9223372036854775807'))

    expect(result?.sourceDataVersion).toBe('9223372036854775807')
    expect((result as unknown as Record<string, unknown>).projectId).toBe('2098698814079639554')
  })

  it('keeps compatibility with safe numeric data versions', () => {
    expect(parseAgentDraftPayload(payload(9))?.sourceDataVersion).toBe('9')
  })

  it.each([null, -1, 1.5, '9x', '01', '', Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid data version %s',
    (value) => {
      expect(parseAgentDraftPayload(payload(value))).toBeNull()
    },
  )

  it('rejects malformed JSON and unsupported report types', () => {
    expect(parseAgentDraftPayload('{')).toBeNull()
    expect(parseAgentDraftPayload(JSON.stringify({
      sourceRunId: 'run-1',
      reportType: 'UNKNOWN',
      sourceDataVersion: '9',
    }))).toBeNull()
  })

  it('normalizes zero and whitespace while preserving integer text', () => {
    expect(normalizeSourceDataVersion(' 9 ')).toBe('9')
    expect(normalizeSourceDataVersion('0')).toBe('0')
  })
})
