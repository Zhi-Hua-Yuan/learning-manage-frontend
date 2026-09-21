import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AxiosResponse } from 'axios'

const mocks = vi.hoisted(() => ({ push: vi.fn(), toastPush: vi.fn() }))

vi.mock('../router', () => ({
  default: { currentRoute: { value: { path: '/ai-rag' } }, push: mocks.push },
}))
vi.mock('@/stores/toast', () => ({ useToastStore: () => ({ push: mocks.toastPush }) }))

import request from '@/utils/request'
import { getRagResultApi, ragAskApi, ragAskStreamApi } from '@/api/ai'
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

  it('parses fragmented SSE events and returns only the validated complete payload', async () => {
    const chunks = [
      'event: accepted\ndata: {"requestId":"stream-1"}\n\n',
      'event: stage\ndata: {"requestId":"stream-1","stage":"RETRIEVING","attempt":1}\n\n',
      'event: complete\ndata: {"requestId":"stream-1","status":"ACTIVE","answer":"ok","sources":[]}\n\n',
    ]
    let index = 0
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/event-stream' }),
      body: {
        getReader: () => ({
          read: async () => {
            if (index >= chunks.length) return { done: true, value: undefined }
            const value = new TextEncoder().encode(chunks[index++])
            return { done: false, value }
          },
          releaseLock: vi.fn(),
        }),
      },
    }))
    const accepted = vi.fn()
    const stage = vi.fn()

    const result = await ragAskStreamApi(
      { question: '为什么延期', projectId: '10' },
      { onAccepted: accepted, onStage: stage },
    )

    expect(accepted).toHaveBeenCalledWith({ requestId: 'stream-1' })
    expect(stage).toHaveBeenCalledWith({ requestId: 'stream-1', stage: 'RETRIEVING', attempt: 1 })
    expect(result.requestId).toBe('stream-1')
  })
})
