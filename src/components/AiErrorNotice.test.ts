import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AiErrorNotice from '@/components/AiErrorNotice.vue'

const presentation = {
  message: '<img src=x onerror=alert(1)>请求失败',
  action: 'RETRY' as const,
  actionLabel: '重新尝试',
  retryable: true,
  traceId: 'trace-wp7',
}

describe('AiErrorNotice', () => {
  const writeText = vi.fn<() => Promise<void>>()

  beforeEach(() => {
    writeText.mockReset()
    writeText.mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
  })

  it('renders the error as text, copies trace id and emits only a manual action', async () => {
    const wrapper = mount(AiErrorNotice, { props: { presentation } })

    expect(wrapper.text()).toContain(presentation.message)
    expect(wrapper.find('img').exists()).toBe(false)

    const buttons = wrapper.findAll('button')
    await buttons[0]!.trigger('click')
    expect(writeText).toHaveBeenCalledWith('trace-wp7')
    expect(wrapper.text()).toContain('已复制')

    await buttons[1]!.trigger('click')
    expect(wrapper.emitted('action')).toEqual([['RETRY']])
  })

  it('keeps the notice usable when clipboard access fails', async () => {
    writeText.mockRejectedValue(new Error('denied'))
    const wrapper = mount(AiErrorNotice, { props: { presentation } })

    await wrapper.findAll('button')[0]!.trigger('click')
    expect(wrapper.text()).toContain('复制失败')
  })
})
