import { describe, expect, it } from 'vitest'

import { ApiRequestError } from '@/utils/request'
import { resolveAiErrorPresentation } from '@/utils/aiErrorPresentation'

describe('resolveAiErrorPresentation', () => {
  it.each([
    [30001, 'RETRY', true],
    [30002, 'RETRY', true],
    [30003, 'RETRY', true],
    [30004, 'CONTACT_ADMIN', false],
    [30005, 'REFRESH_STATE', false],
    [30006, 'REFRESH_STATE', false],
    [30007, 'REFRESH_STATE', false],
    [30008, 'REFRESH_STATE', false],
    [30009, 'NONE', false],
    [30010, 'RETRY', true],
    [30011, 'EDIT_INPUT', false],
    [42900, 'RETRY', true],
  ] as const)('maps AI code %i to %s', (code, action, retryable) => {
    const presentation = resolveAiErrorPresentation(
      new ApiRequestError('raw upstream detail', { code, traceId: 'trace-7' }),
    )

    expect(presentation).toMatchObject({ action, retryable, traceId: 'trace-7' })
    expect(presentation.message).not.toContain('raw upstream detail')
  })

  it('classifies transport failures as manually retryable without inventing a trace id', () => {
    expect(resolveAiErrorPresentation(new ApiRequestError('offline'))).toEqual({
      message: 'AI 请求未完成，请检查网络后手动重试。',
      action: 'RETRY',
      actionLabel: '重新尝试',
      retryable: true,
      traceId: null,
    })
  })

  it('uses the caller fallback for non-AI business errors', () => {
    expect(
      resolveAiErrorPresentation(
        new ApiRequestError('forbidden', { code: 40300, httpStatus: 403, traceId: 'trace-p' }),
        '关联任务权限已变化。',
      ),
    ).toEqual({
      message: '关联任务权限已变化。',
      action: 'NONE',
      actionLabel: null,
      retryable: false,
      traceId: 'trace-p',
    })
  })
})
