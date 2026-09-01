import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TaskStatusRecoveryNotice from './TaskStatusRecoveryNotice.vue'

describe('TaskStatusRecoveryNotice', () => {
  it('offers exact-request retry and fact refresh for an uncertain result', async () => {
    const wrapper = mount(TaskStatusRecoveryNotice, {
      props: { phase: 'uncertain', message: '网络结果未知。' },
    })

    await wrapper.get('[data-testid="task-status-retry-request"]').trigger('click')
    await wrapper.get('[data-testid="task-status-refresh-facts"]').trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
    expect(wrapper.emitted('refresh')).toHaveLength(1)
  })

  it('allows only fact refresh after the write is known to be committed', () => {
    const wrapper = mount(TaskStatusRecoveryNotice, {
      props: { phase: 'committed-refresh-error' },
    })

    expect(wrapper.find('[data-testid="task-status-retry-request"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="task-status-refresh-facts"]').text()).toContain('重新加载')
  })

  it('shows no action while reconciliation is busy', () => {
    const wrapper = mount(TaskStatusRecoveryNotice, {
      props: { phase: 'reconciling' },
    })

    expect(wrapper.find('button').exists()).toBe(false)
  })
})
