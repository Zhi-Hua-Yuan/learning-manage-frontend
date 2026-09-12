import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AxiosResponse } from 'axios'

const mocks = vi.hoisted(() => ({ push: vi.fn(), toastPush: vi.fn() }))

vi.mock('../router', () => ({
  default: { currentRoute: { value: { path: '/ai-agent' } }, push: mocks.push },
}))
vi.mock('@/stores/toast', () => ({ useToastStore: () => ({ push: mocks.toastPush }) }))

import request from '@/utils/request'
import {
  cancelAgentRunApi,
  confirmAgentReportApi,
  deleteAnalysisReportApi,
  getAgentRunApi,
  getAnalysisReportApi,
  listAnalysisReportsApi,
  submitProjectRiskAgentApi,
  submitTeamWorkloadAgentApi,
} from '@/api/ai'
import { clearAuthToken } from '@/utils/authToken'

describe('Stage 6 Agent API client', () => {
  const calls: Array<{ method?: string; url?: string; data?: unknown; params?: unknown }> = []

  beforeEach(() => {
    calls.length = 0
    clearAuthToken()
    request.defaults.adapter = async (config) => {
      calls.push({ method: config.method?.toUpperCase(), url: config.url, data: config.data, params: config.params })
      let data: unknown = {}
      if (config.url === '/ai/agent/report/confirm') {
        data = { success: true, idempotentReplay: false, businessId: '2098698814079639554' }
      } else if (config.url === '/ai/report') {
        data = { records: [], current: '1', size: '20', total: '0', pages: '0' }
      } else if (config.url?.startsWith('/ai/report/')) {
        data = {
          reportId: 'report-1', reportType: 'PROJECT_RISK', projectId: '2098698814079639554',
          teamId: null, status: 'ACTIVE', summary: 'Summary', memberMetrics: {},
          recommendations: [], sources: [], generatedAt: '2026-09-12T17:08:11',
        }
      }
      const response: AxiosResponse = {
        data: { code: 0, data }, status: 200, statusText: 'OK', headers: {}, config,
      }
      return response
    }
  })

  it('uses stable asynchronous run routes and encodes opaque IDs', async () => {
    await submitProjectRiskAgentApi('10', 'request-1')
    await submitTeamWorkloadAgentApi('20', 'request-2')
    await getAgentRunApi('run/with space')
    await cancelAgentRunApi('run/with space')

    expect(calls[0]).toMatchObject({ method: 'POST', url: '/ai/agent/project-risk' })
    expect(JSON.parse(String(calls[0]?.data))).toEqual({ projectId: '10', clientRequestId: 'request-1' })
    expect(calls[1]).toMatchObject({ method: 'POST', url: '/ai/agent/team-workload' })
    expect(calls[2]).toMatchObject({ method: 'GET', url: '/ai/agent/run/run%2Fwith%20space' })
    expect(calls[3]).toMatchObject({ method: 'POST', url: '/ai/agent/run/run%2Fwith%20space/cancel' })
  })

  it('keeps confirmation and report operations explicit', async () => {
    const confirmation = await confirmAgentReportApi('draft-1', 'operation-1')
    const page = await listAnalysisReportsApi({ current: 1, pageSize: 20 })
    const report = await getAnalysisReportApi('report/1')
    await deleteAnalysisReportApi('report/1')

    expect(confirmation.businessId).toBe('2098698814079639554')
    expect(page).toMatchObject({ current: 1, size: 20, total: 0, pages: 0 })
    expect(report.projectId).toBe('2098698814079639554')

    expect(JSON.parse(String(calls[0]?.data))).toEqual({ draftId: 'draft-1', operationId: 'operation-1' })
    expect(calls[0]).toMatchObject({ method: 'POST', url: '/ai/agent/report/confirm' })
    expect(calls[1]).toMatchObject({ method: 'GET', url: '/ai/report', params: { current: 1, pageSize: 20 } })
    expect(calls[2]).toMatchObject({ method: 'GET', url: '/ai/report/report%2F1' })
    expect(calls[3]).toMatchObject({ method: 'POST', url: '/ai/report/report%2F1/delete' })
  })
})
