import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TaskAssigneeEntry from './TaskAssigneeEntry.vue'
import type { TaskAssigneePresentation } from '@/utils/taskAssigneePresentation'

const presentation = (
  overrides: Partial<TaskAssigneePresentation> = {},
): TaskAssigneePresentation => ({
  kind: 'resolved',
  userId: '8',
  label: '团队成员',
  description: null,
  ...overrides,
})

describe('TaskAssigneeEntry', () => {
  it('renders resolved facts and emits an accessible change request', async () => {
    const wrapper = mount(TaskAssigneeEntry, {
      props: {
        presentation: presentation(),
        assignAllowed: true,
        assignDeniedMessage: null,
      },
    })

    expect(wrapper.get('[data-testid="task-assignee-label"]').text()).toBe('团队成员')
    expect(wrapper.find('[data-testid="task-assignee-locked"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="task-assignee-inactive"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="task-assignee-change"]').attributes('aria-label')).toContain(
      '变更',
    )
    await wrapper.get('[data-testid="task-assignee-history"]').trigger('click')
    expect(wrapper.emitted('request-history')).toHaveLength(1)
    await wrapper.get('[data-testid="task-assignee-change"]').trigger('click')
    expect(wrapper.emitted('request-change')).toHaveLength(1)
    expect(wrapper.html()).not.toContain('v-html')
  })

  it('renders safe fallback labels and a locked explanation', () => {
    const wrapper = mount(TaskAssigneeEntry, {
      props: {
        presentation: presentation({
          kind: 'inactive',
          label: '用户 #8',
          description: '该负责人已不在当前团队成员列表中。',
        }),
        assignAllowed: false,
        assignDeniedMessage: '你没有变更此任务负责人的权限。',
      },
    })

    expect(wrapper.get('[data-testid="task-assignee-label"]').text()).toBe('用户 #8')
    expect(wrapper.get('[data-testid="task-assignee-description"]').text()).toContain(
      '已不在当前团队',
    )
    expect(wrapper.get('[data-testid="task-assignee-inactive"]').text()).toBe('已不在团队')
    expect(wrapper.find('[data-testid="task-assignee-change"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="task-assignee-history"]').exists()).toBe(true)
  })
})
