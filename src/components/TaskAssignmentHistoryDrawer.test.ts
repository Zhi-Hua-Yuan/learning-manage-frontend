import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TaskAssignmentHistoryDrawer from './TaskAssignmentHistoryDrawer.vue'
import type { TaskAssignmentHistory } from '@/types/task'

const record = (overrides: Partial<TaskAssignmentHistory> = {}): TaskAssignmentHistory => ({
  id: '10',
  taskId: '1',
  action: 'REASSIGN',
  fromAssignee: { userId: '8', username: '原负责人' },
  toAssignee: { userId: '9', username: '新负责人' },
  assignedBy: { userId: '1', username: '管理员' },
  reason: '本周任务调整',
  createTime: '2026-09-01T10:00:00.000Z',
  ...overrides,
})

const mountDrawer = (overrides: Record<string, unknown> = {}) =>
  mount(TaskAssignmentHistoryDrawer, {
    props: {
      open: true,
      taskTitle: '接口联调',
      records: [record()],
      phase: 'ready',
      errorMessage: null,
      hasMore: false,
      total: 1,
      ...overrides,
    },
  })

describe('TaskAssignmentHistoryDrawer', () => {
  it('renders assignment facts and action labels', () => {
    const wrapper = mountDrawer()

    expect(wrapper.get('[data-testid="task-assignment-history-title"]').text()).toBe('接口联调')
    expect(wrapper.get('[data-testid="task-assignment-history-item"]').text()).toContain(
      '转派负责人',
    )
    expect(wrapper.get('[data-testid="task-assignment-history-change"]').text()).toContain(
      '原负责人',
    )
    expect(wrapper.get('[data-testid="task-assignment-history-change"]').text()).toContain(
      '新负责人',
    )
    expect(wrapper.get('[data-testid="task-assignment-history-reason"]').text()).toBe(
      '本周任务调整',
    )
  })

  it('renders safe fallbacks and reason as plain text', () => {
    const wrapper = mountDrawer({
      records: [
        record({
          action: 'UNKNOWN',
          fromAssignee: { userId: null, username: null },
          toAssignee: { userId: '9', username: null },
          assignedBy: { userId: '1', username: null },
          reason: '<img src=x onerror=alert(1)>',
        }),
      ],
    })

    expect(wrapper.text()).toContain('未知负责人变更')
    expect(wrapper.text()).toContain('未分配')
    expect(wrapper.text()).toContain('用户 #9')
    expect(wrapper.text()).toContain('<img src=x onerror=alert(1)>')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.html()).not.toContain('v-html')
  })

  it('shows empty, loading and error states', () => {
    expect(
      mountDrawer({ records: [], phase: 'ready' })
        .get('[data-testid="task-assignment-history-empty"]')
        .text(),
    ).toContain('暂无负责人变更记录')
    expect(
      mountDrawer({ records: [], phase: 'loading' })
        .find('[data-testid="task-assignment-history-loading"]')
        .exists(),
    ).toBe(true)
    expect(
      mountDrawer({ records: [], phase: 'error', errorMessage: '网络异常' })
        .get('[data-testid="task-assignment-history-error"]')
        .text(),
    ).toContain('网络异常')
  })

  it('keeps records visible while refreshing or recovering a refresh failure', () => {
    const refreshing = mountDrawer({ phase: 'refreshing' })
    expect(refreshing.find('[data-testid="task-assignment-history-refreshing"]').exists()).toBe(true)
    expect(refreshing.find('[data-testid="task-assignment-history-item"]').exists()).toBe(true)

    const failed = mountDrawer({ phase: 'error', errorMessage: '刷新失败' })
    expect(failed.find('[data-testid="task-assignment-history-refresh-error"]').exists()).toBe(true)
    expect(failed.find('[data-testid="task-assignment-history-item"]').exists()).toBe(true)
  })

  it('emits close, retry and load-more events', async () => {
    const wrapper = mountDrawer({ hasMore: true, total: 2 })

    await wrapper.get('[data-testid="task-assignment-history-close"]').trigger('click')
    await wrapper.get('[data-testid="task-assignment-history-load-more"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('load-more')).toHaveLength(1)

    const retryWrapper = mountDrawer({ records: [], phase: 'error' })
    await retryWrapper.get('[data-testid="task-assignment-history-retry"]').trigger('click')
    expect(retryWrapper.emitted('retry')).toHaveLength(1)
  })

  it('keeps loaded records when the next page fails', () => {
    const wrapper = mountDrawer({ phase: 'load-more-error', errorMessage: '下一页失败' })

    expect(wrapper.find('[data-testid="task-assignment-history-item"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="task-assignment-history-load-more-error"]').text()).toContain(
      '下一页失败',
    )
  })
})
