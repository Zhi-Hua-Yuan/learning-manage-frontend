import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { SharedWeeklyReview } from '@/types/review'
import SharedWeeklyReviewCard from './SharedWeeklyReviewCard.vue'

const review = (overrides: Partial<SharedWeeklyReview> = {}): SharedWeeklyReview => ({
  id: 'review-1',
  author: { id: 'user-1', username: 'Alice' },
  year: 2026,
  weekNo: 36,
  startDate: '2026-08-31',
  endDate: '2026-09-06',
  focusProject: { id: 'project-1', name: '学习平台' },
  sharedSummary: '本周完成了权限与复盘能力。',
  createTime: '2026-09-01T08:00:00',
  updateTime: '2026-09-01T09:00:00',
  ...overrides,
})

const mountCard = (value: SharedWeeklyReview = review()) => mount(SharedWeeklyReviewCard, {
  props: { review: value },
})

describe('SharedWeeklyReviewCard', () => {
  it('renders only the public weekly review summary fields', () => {
    const wrapper = mountCard()

    expect(wrapper.get('[data-testid="shared-weekly-review-author"]').text()).toBe('Alice')
    expect(wrapper.get('[data-testid="shared-weekly-review-week"]').text()).toContain('2026 年第 36 周')
    expect(wrapper.get('[data-testid="shared-weekly-review-summary"]').text()).toBe(
      '本周完成了权限与复盘能力。',
    )
    expect(wrapper.get('[data-testid="shared-weekly-review-date-range"]').text()).toContain(
      '2026-08-31 至 2026-09-06',
    )
    expect(wrapper.get('[data-testid="shared-weekly-review-focus-project"]').text()).toContain(
      '重点项目：学习平台',
    )
    expect(wrapper.get('[data-testid="shared-weekly-review-updated-at"]').attributes('datetime')).toBe(
      '2026-09-01T09:00:00',
    )
  })

  it('renders the shared summary as escaped plain text', () => {
    const wrapper = mountCard(review({
      sharedSummary: '<img src="x" onerror="alert(1)"> <script>alert(1)</script>',
    }))

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.get('[data-testid="shared-weekly-review-summary"]').text()).toContain('<img')
  })

  it('does not render private fields or expose card-level actions', () => {
    const value = review({
      reflection: 'private reflection',
      nextPlan: 'private plan',
      taskIds: ['task-1'],
      completedTaskCount: 9,
      teamId: 'team-1',
      visibilityScope: 'TEAM',
    } as never)
    const wrapper = mountCard(value)
    expect(wrapper.text()).not.toContain('private reflection')
    expect(wrapper.text()).not.toContain('private plan')
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('degrades safely when optional public fields are missing', () => {
    const wrapper = mountCard(review({
      author: { id: null, username: '   ' },
      startDate: null,
      endDate: null,
      focusProject: null,
      sharedSummary: '   ',
      updateTime: null,
    }))

    expect(wrapper.get('[data-testid="shared-weekly-review-author"]').text()).toBe('团队成员')
    expect(wrapper.get('[data-testid="shared-weekly-review-summary"]').text()).toBe('共享摘要暂不可用')
    expect(wrapper.find('[data-testid="shared-weekly-review-date-range"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="shared-weekly-review-focus-project"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="shared-weekly-review-updated-at"]').exists()).toBe(false)
  })
})
