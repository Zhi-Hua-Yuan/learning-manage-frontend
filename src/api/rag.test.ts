import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AxiosResponse } from 'axios'

const mocks = vi.hoisted(() => ({ push: vi.fn(), toastPush: vi.fn() }))

vi.mock('../router', () => ({
  default: { currentRoute: { value: { path: '/ai-rag' } }, push: mocks.push },
}))
vi.mock('@/stores/toast', () => ({ useToastStore: () => ({ push: mocks.toastPush }) }))

import request from '@/utils/request'
import { getRagResultApi, ragAskApi } from '@/api/ai'
import { clearAuthToken } from '@/utils/authToken'

describe('RAG API client', () => {
  beforeEach(() => {
    clearAuthToken()
    mocks.push.mockReset()
  })

  it('uses the stable ask and opaque result routes', async () => {
    const calls: Array<{ method?: string; url?: string; data?: unknown }> = []
    request.defaults.adapter = async (config) => {
      calls.push({ method: config.method?.toUpperCase(), url: config.url, data: config.data })
      const response: AxiosResponse = {
        data: { code: 0, data: { requestId: 'request/with space', status: 'ACTIVE', sources: [] } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }
      return response
    }

    await ragAskApi({ question: '为什么延期', projectId: '10' })
    await getRagResultApi('request/with space')

    expect(calls[0]).toMatchObject({ method: 'POST', url: '/ai/rag/ask' })
    expect(JSON.parse(String(calls[0]?.data))).toEqual({ question: '为什么延期', projectId: '10' })
    expect(calls[1]).toMatchObject({
      method: 'GET',
      url: '/ai/rag/result/request%2Fwith%20space',
    })
  })
})
