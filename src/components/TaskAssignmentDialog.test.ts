import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TaskAssignmentDialog from './TaskAssignmentDialog.vue'
import type { TaskAssigneeOption } from '@/utils/taskAssigneeOptions'
import type { TaskAssigneePresentation } from '@/utils/taskAssigneePresentation'

const currentAssignee: TaskAssigneePresentation = {
  kind: 'resolved',
  userId: '1',
  label: '成员一',
  description: null,
}

const options: TaskAssigneeOption[] = [
  {
    value: null,
    label: '未分配',
    description: '暂不指定任务负责人',
    role: null,
    disabled: false,
    kind: 'unassigned',
  },
  {
    value: '1',
    label: '成员一',
    description: '成员',
    role: 'MEMBER',
    disabled: false,
    kind: 'member',
  },
  {
    value: '2',
    label: '成员二',
    description: '成员',
    role: 'MEMBER',
    disabled: false,
    kind: 'member',
  },
]

const mountDialog = (props: Record<string, unknown> = {}) => mount(TaskAssignmentDialog, {
  props: {
    open: true,
    taskTitle: '交接任务',
    currentAssignee,
    targetAssigneeUserId: '1',
    options,
    reason: '',
    ...props,
  },
  global: { stubs: { Transition: false } },
})

describe('TaskAssignmentDialog', () => {
  it('fails closed for no-change and emits a normalized reassignment preview', async () => {
    const wrapper = mountDialog()
    expect(wrapper.get('[data-testid="task-assignment-confirm"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="task-assignment-summary"]').text()).toContain('请选择不同')

    await wrapper.setProps({ targetAssigneeUserId: '2', reason: '  handoff  ' })
    expect(wrapper.get('[data-testid="task-assignment-confirm"]').text()).toBe('转派负责人')
    await wrapper.get('[data-testid="task-assignment-confirm"]').trigger('click')

    expect(wrapper.emitted('confirm')?.[0]).toEqual([{
      targetAssigneeUserId: '2',
      reason: 'handoff',
    }])
  })

  it('supports explicit team unassignment', async () => {
    const wrapper = mountDialog({ targetAssigneeUserId: null })
    expect(wrapper.get('[data-testid="task-assignment-confirm"]').text()).toBe('解除分配')
    expect(wrapper.get('[data-testid="task-assignment-summary"]').text()).toContain('将解除')
  })

  it('keeps the draft and disables confirmation for candidate errors', () => {
    const wrapper = mountDialog({
      targetAssigneeUserId: '2',
      candidatesErrorMessage: '无法加载团队成员，请检查网络后重试。',
      reason: '保留的原因',
    })

    expect(wrapper.get('[data-testid="task-assignment-reason"]').element).toHaveProperty('value', '保留的原因')
    expect(wrapper.get('[data-testid="task-assignment-confirm"]').attributes('disabled')).toBeDefined()
  })

  it('reports control characters and renders HTML-looking reasons as plain text', async () => {
    const wrapper = mountDialog({ targetAssigneeUserId: '2', reason: 'bad\nreason' })
    expect(wrapper.get('[data-testid="task-assignment-reason-error"]').text()).toContain('控制字符')
    expect(wrapper.get('[data-testid="task-assignment-confirm"]').attributes('disabled')).toBeDefined()

    await wrapper.setProps({ reason: '<script>alert(1)</script>' })
    const textarea = wrapper.get('[data-testid="task-assignment-reason"]')
    expect((textarea.element as HTMLTextAreaElement).value).toBe('<script>alert(1)</script>')
    expect(wrapper.find('script').exists()).toBe(false)
  })

  it('emits cancel on Escape when it is not busy', async () => {
    const wrapper = mountDialog()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    wrapper.unmount()
  })
})
