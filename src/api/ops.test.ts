import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AxiosResponse } from 'axios'

const mocks = vi.hoisted(() => ({ push: vi.fn(), toastPush: vi.fn() }))
vi.mock('../router', () => ({ default: { currentRoute: { value: { path: '/admin/ai-ops' } }, push: mocks.push } }))
vi.mock('@/stores/toast', () => ({ useToastStore: () => ({ push: mocks.toastPush }) }))

import request from '@/utils/request'
import { cancelCleanupApi, fetchCleanupRunApi, fetchCleanupRunsApi, fetchOpsFailuresApi, fetchOpsOverviewApi, submitCleanupApi } from '@/api/ops'

describe('Stage 7 operations API client', () => {
  const calls: Array<{ method?: string; url?: string; data?: unknown; params?: unknown }> = []

  beforeEach(() => {
    calls.length = 0
    request.defaults.adapter = async (config) => {
      calls.push({ method: config.method?.toUpperCase(), url: config.url, data: config.data, params: config.params })
      const response: AxiosResponse = { data: { code: 0, data: {} }, status: 200, statusText: 'OK', headers: {}, config }
      return response
    }
  })

  it('uses the frozen operations and cleanup routes', async () => {
    await fetchOpsOverviewApi()
    await fetchCleanupRunsApi(2, 10)
    await fetchCleanupRunApi('cleanup/run')
    await fetchOpsFailuresApi()
    await submitCleanupApi(true, 'cleanup-request-1')
    await cancelCleanupApi('cleanup/run')

    expect(calls[0]).toMatchObject({ method: 'GET', url: '/admin/ai/ops/overview' })
    expect(calls[1]).toMatchObject({ method: 'GET', url: '/admin/ai/ops/cleanup-runs', params: { current: 2, size: 10 } })
    expect(calls[2]).toMatchObject({ method: 'GET', url: '/admin/ai/ops/cleanup-runs/cleanup%2Frun' })
    expect(calls[3]).toMatchObject({ method: 'GET', url: '/admin/ai/ops/failures', params: { current: 1, size: 20 } })
    expect(JSON.parse(String(calls[4]?.data))).toEqual({ dryRun: true, clientRequestId: 'cleanup-request-1' })
    expect(calls[5]).toMatchObject({ method: 'POST', url: '/admin/ai/ops/cleanup-runs/cleanup%2Frun/cancel' })
  })
})
