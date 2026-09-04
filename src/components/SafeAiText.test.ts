import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import SafeAiText from '@/components/SafeAiText.vue'

describe('SafeAiText', () => {
  it('renders hostile model output as text without creating active elements', () => {
    const payload = '<script>alert(1)</script><img src=x onerror=alert(2)>[link](javascript:alert(3))'
    const wrapper = mount(SafeAiText, { props: { as: 'div', text: payload } })

    expect(wrapper.text()).toBe(payload)
    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('keeps line breaks in one text node and supports an empty value', async () => {
    const wrapper = mount(SafeAiText, { props: { text: '第一行\n第二行' } })
    expect(wrapper.text()).toBe('第一行\n第二行')
    expect(wrapper.classes()).toContain('whitespace-pre-wrap')

    await wrapper.setProps({ text: null })
    expect(wrapper.text()).toBe('')
  })
})
