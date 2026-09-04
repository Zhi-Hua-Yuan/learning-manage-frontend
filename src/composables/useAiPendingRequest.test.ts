import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))

import { useAiPendingRequest } from '@/composables/useAiPendingRequest'
import { AI_PENDING_BOARDS, useAiPendingRegistryStore } from '@/stores/aiPendingRegistry'
import { ApiRequestError } from '@/utils/request'

describe('useAiPendingRequest', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    toast.success.mockReset()
    toast.error.mockReset()
  })

  it('stores a safe AI presentation, releases pending state and never retries automatically', async () => {
    const request = vi.fn().mockRejectedValue(
      new ApiRequestError('raw provider detail', {
        code: 30011,
        traceId: 'trace-content-7',
      }),
    )
    const { runAiRequest } = useAiPendingRequest()
    const result = await runAiRequest({
      board: AI_PENDING_BOARDS.AI_PLANNER_BREAKDOWN,
      request,
      successMessage: 'ok',
      errorMessage: 'fallback',
    })

    expect(request).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      status: 'error',
      errorMessage: '输入中包含禁止发送的敏感信息，请修改后再试。',
      errorPresentation: {
        action: 'EDIT_INPUT',
        retryable: false,
        traceId: 'trace-content-7',
      },
    })
    expect(result.errorMessage).not.toContain('raw provider detail')

    const entry = useAiPendingRegistryStore().boards[AI_PENDING_BOARDS.AI_PLANNER_BREAKDOWN]
    expect(entry.status).toBe('error')
    expect(entry.errorPresentation?.traceId).toBe('trace-content-7')
    expect(toast.error).toHaveBeenCalledWith('输入中包含禁止发送的敏感信息，请修改后再试。')
  })
})
