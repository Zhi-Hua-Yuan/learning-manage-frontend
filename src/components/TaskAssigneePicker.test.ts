import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { TaskAssigneeOption } from '@/utils/taskAssigneeOptions'
import TaskAssigneePicker from './TaskAssigneePicker.vue'

const options: TaskAssigneeOption[] = [
  { value: null, label: '未分配', description: '暂不指定任务负责人', role: null, disabled: false, kind: 'unassigned' },
  { value: '1', label: '管理员', description: '管理员', role: 'ADMIN', disabled: false, kind: 'member' },
  { value: '2', label: '不可选成员', description: '成员', role: 'MEMBER', disabled: true, kind: 'member' },
]

const mountPicker = (overrides: Record<string, unknown> = {}) => mount(TaskAssigneePicker, {
  props: {
    modelValue: null,
    options,
    ...overrides,
  },
})

describe('TaskAssigneePicker', () => {
  it('opens and emits the selected value', async () => {
    const wrapper = mountPicker()
    await wrapper.get('[data-testid="task-assignee-picker-trigger"]').trigger('click')
    await wrapper.get('[role="option"]:not([disabled])').trigger('click')

    expect(wrapper.emitted('open')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([null])
  })

  it('renders loading, error and retry states', async () => {
    const wrapper = mountPicker({ loading: true })
    await wrapper.get('[data-testid="task-assignee-picker-trigger"]').trigger('click')
    expect(wrapper.find('[data-testid="task-assignee-picker-loading"]').exists()).toBe(true)

    await wrapper.setProps({ loading: false, errorMessage: '成员加载失败' })
    expect(wrapper.get('[data-testid="task-assignee-picker-error"]').text()).toContain('成员加载失败')
    await wrapper.get('[data-testid="task-assignee-picker-retry"]').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('does not open while disabled', async () => {
    const wrapper = mountPicker({ disabled: true })
    await wrapper.get('[data-testid="task-assignee-picker-trigger"]').trigger('click')
    expect(wrapper.find('[data-testid="task-assignee-picker-menu"]').exists()).toBe(false)
    expect(wrapper.emitted('open')).toBeUndefined()
  })

  it('supports keyboard selection and escape', async () => {
    const wrapper = mountPicker()
    const trigger = wrapper.get('[data-testid="task-assignee-picker-trigger"]')
    await trigger.trigger('keydown', { key: 'ArrowDown' })
    const menu = wrapper.get('[data-testid="task-assignee-picker-menu"]')
    await menu.trigger('keydown', { key: 'ArrowDown' })
    await menu.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['1'])
    expect(wrapper.find('[data-testid="task-assignee-picker-menu"]').exists()).toBe(false)

    await trigger.trigger('keydown', { key: 'ArrowDown' })
    await wrapper.get('[data-testid="task-assignee-picker-menu"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[data-testid="task-assignee-picker-menu"]').exists()).toBe(false)
  })

  it('renders labels as text and skips disabled options', async () => {
    const unsafeOptions: TaskAssigneeOption[] = [
      { ...options[0]! },
      { ...options[1]!, label: '<img src=x onerror=alert(1)>' },
    ]
    const wrapper = mountPicker({ options: unsafeOptions })
    await wrapper.get('[data-testid="task-assignee-picker-trigger"]').trigger('click')
    expect(wrapper.html()).not.toContain('<img')
    expect(wrapper.findAll('[role="option"]')[1]!.text()).toContain('<img src=x onerror=alert(1)>')
  })
})
