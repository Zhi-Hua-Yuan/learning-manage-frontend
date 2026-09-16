import { describe, expect, it } from 'vitest'

import {
  normalizeAiDraftConfirmResponse,
  normalizeAnalysisReportPage,
  normalizeAnalysisReportResponse,
} from '@/api/ai'

const report = {
  reportId: 'report-1',
  reportType: 'PROJECT_RISK' as const,
  projectId: '2098698814079639554',
  teamId: null,
  status: 'ACTIVE' as const,
  summary: 'Summary',
  memberMetrics: {},
  recommendations: [],
  sources: [{
    citationId: 'S1',
    sourceType: 'TASK' as const,
    sourceId: '2098698814079639555',
    title: 'Task',
  }],
  generatedAt: '2026-09-12T17:08:11',
}

describe('AI wire contract normalization', () => {
  it('preserves a precise Long business ID as a string', () => {
    expect(normalizeAiDraftConfirmResponse({
      success: true,
      idempotentReplay: false,
      businessId: '2098698814079639554',
    })).toEqual({
      success: true,
      idempotentReplay: false,
      businessId: '2098698814079639554',
    })
  })

  it('normalizes safe numeric IDs and rejects malformed successful responses', () => {
    expect(normalizeAiDraftConfirmResponse({
      success: true,
      idempotentReplay: true,
      businessId: 101,
    }).businessId).toBe('101')
    expect(() => normalizeAiDraftConfirmResponse({
      success: true,
      idempotentReplay: false,
      businessId: 'bad-id',
    })).toThrow('无效的业务 ID')
  })

  it('normalizes report IDs without losing precision', () => {
    const normalized = normalizeAnalysisReportResponse(report)

    expect(normalized.projectId).toBe('2098698814079639554')
    expect(normalized.sources[0]?.sourceId).toBe('2098698814079639555')
  })

  it('converts string pagination metadata to safe numbers', () => {
    expect(normalizeAnalysisReportPage({
      records: [report],
      current: '2',
      size: '20',
      total: '37',
      pages: '2',
    })).toMatchObject({
      current: 2,
      size: 20,
      total: 37,
      pages: 2,
    })
  })

  it('uses safe pagination defaults and rejects malformed source IDs', () => {
    expect(normalizeAnalysisReportPage({ current: 'bad', size: 'bad', total: 'bad' })).toEqual({
      records: [], current: 1, size: 20, total: 0, pages: 0,
    })
    expect(() => normalizeAnalysisReportResponse({
      ...report,
      sources: [{
        citationId: 'S1',
        sourceType: 'TASK',
        sourceId: Number.MAX_SAFE_INTEGER + 1,
        title: 'Task',
      }],
    })).toThrow('无效的来源 ID')
  })
})
