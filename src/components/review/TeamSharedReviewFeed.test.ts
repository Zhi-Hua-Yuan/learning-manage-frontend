import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { SharedWeeklyReview } from '@/types/review'
import type { TeamContext } from '@/types/team'
import type { TeamSharedReviewPhase } from '@/composables/useTeamSharedReviews'
import TeamSharedReviewFeed from './TeamSharedReviewFeed.vue'

const teams: TeamContext[] = [
  { id: 'team-a', ownerId: 'owner-a', name: '研发团队', description: '', role: 'MEMBER' },
  { id: 'team-b', ownerId: 'owner-b', name: '产品团队', description: '', role: 'ADMIN' },
]

const review = (id = 'review-1'): SharedWeeklyReview => ({
  id,
  author: { id: 'user-1', username: `成员 ${id}` },
  year: 2026,
  weekNo: 36,
  startDate: '2026-08-31',
  endDate: '2026-09-06',
  focusProject: { id: 'project-1', name: '学习平台' },
  sharedSummary: `共享摘要 ${id}`,
  createTime: '2026-09-01T08:00:00',
  updateTime: '2026-09-01T09:00:00',
})

const mountFeed = (overrides: Partial<{
  teams: readonly TeamContext[]
  selectedTeamId: string | null
  records: readonly SharedWeeklyReview[]
  phase: TeamSharedReviewPhase
  errorMessage: string | null
  hasMore: boolean
  busy: boolean
  teamsLoading: boolean
  teamsError: string | null
}> = {}) => mount(TeamSharedReviewFeed, {
  props: {
    teams,
    selectedTeamId: null,
    records: [],
    phase: 'idle',
    errorMessage: null,
    hasMore: false,
    busy: false,
    ...overrides,
  },
})

describe('TeamSharedReviewFeed', () => {
  it('provides an accessible team selector and emits selection without fetching', async () => {
    const wrapper = mountFeed()
    const select = wrapper.get('[data-testid="team-shared-review-team-select"]')

    expect(select.attributes('id')).toBe('team-shared-review-team-select')
    expect(wrapper.get('label').attributes('for')).toBe('team-shared-review-team-select')

    await select.setValue('team-b')

    expect(wrapper.emitted('select-team')).toEqual([['team-b']])
    expect(wrapper.find('[data-testid="team-shared-review-select-team"]').exists()).toBe(true)
  })

  it('renders loading, empty and team-context states', () => {
    expect(mountFeed({ teamsLoading: true }).find('[data-testid="team-shared-review-loading"]').exists()).toBe(false)
    expect(mountFeed({ teamsLoading: true }).text()).toContain('正在加载可访问团队')
    expect(mountFeed({ teams: [] }).get('[data-testid="team-shared-review-no-teams"]').text()).toContain('没有可访问的团队')
    expect(mountFeed().get('[data-testid="team-shared-review-select-team"]').text()).toContain('请选择团队')
    expect(mountFeed({ selectedTeamId: 'team-a', phase: 'ready' }).get('[data-testid="team-shared-review-empty"]').text()).toContain(
      '暂无共享复盘',
    )
  })

  it('supports retrying team context errors', async () => {
    const wrapper = mountFeed({
      teamsError: '团队列表加载失败。',
    })

    expect(wrapper.get('[role="alert"]').text()).toContain('团队列表加载失败。')
    expect(wrapper.get('[data-testid="team-shared-review-team-select"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-testid="team-shared-review-retry-teams"]').trigger('click')

    expect(wrapper.emitted('retry-teams')).toHaveLength(1)
  })

  it('renders shared cards without card-level mutation controls', () => {
    const wrapper = mountFeed({
      selectedTeamId: 'team-a',
      phase: 'ready',
      records: [review('review-1'), review('review-2')],
    })

    expect(wrapper.get('[data-testid="team-shared-review-list"]').findAll('article')).toHaveLength(2)
    expect(wrapper.text()).toContain('共享摘要 review-1')
    expect(wrapper.text()).not.toContain('编辑')
    expect(wrapper.text()).not.toContain('删除')
    expect(wrapper.text()).not.toContain('导出正文')
    expect(wrapper.get('[data-testid="team-shared-review-list"]').findAll('button')).toHaveLength(0)
  })

  it('keeps records visible while refreshing and allows a safe retry', async () => {
    const wrapper = mountFeed({
      selectedTeamId: 'team-a',
      phase: 'refresh-error',
      errorMessage: '刷新失败，请稍后重试。',
      records: [review()],
    })

    expect(wrapper.find('[data-testid="shared-weekly-review-card"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="team-shared-review-refresh-error"]').text()).toContain('刷新失败')
    await wrapper.get('[data-testid="team-shared-review-refresh-retry"]').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('supports loading more and retrying a failed next page', async () => {
    const loading = mountFeed({
      selectedTeamId: 'team-a',
      phase: 'loading-more',
      busy: true,
      hasMore: true,
      records: [review()],
    })
    expect(loading.get('[data-testid="team-shared-review-load-more"]').text()).toContain('加载中')
    expect(loading.get('[data-testid="team-shared-review-load-more"]').attributes('disabled')).toBeDefined()

    const failed = mountFeed({
      selectedTeamId: 'team-a',
      phase: 'load-more-error',
      errorMessage: '下一页加载失败。',
      hasMore: true,
      records: [review()],
    })
    expect(failed.find('[data-testid="shared-weekly-review-card"]').exists()).toBe(true)
    await failed.get('[data-testid="team-shared-review-load-more-retry"]').trigger('click')
    expect(failed.emitted('load-more')).toHaveLength(1)
  })

  it.each([
    ['forbidden', '当前无权查看该团队动态。'],
    ['not-found', '团队或共享复盘已失效。'],
    ['authentication-required', '登录状态已失效。'],
  ] as const)('renders terminal state %s without stale cards', (phase, title) => {
    const wrapper = mountFeed({
      selectedTeamId: null,
      phase,
      records: [],
      errorMessage: '状态已清理。',
    })

    expect(wrapper.get(`[data-testid="${phase}-state"]`).text()).toContain(title)
    expect(wrapper.find('[data-testid="shared-weekly-review-card"]').exists()).toBe(false)
  })

  it('does not expose author detail navigation or private mutation actions', () => {
    const wrapper = mountFeed({
      selectedTeamId: 'team-a',
      phase: 'ready',
      records: [review()],
    })

    expect(wrapper.find('[data-testid="shared-weekly-review-card"] a').exists()).toBe(false)
    expect(wrapper.find('[data-testid="shared-weekly-review-card"] button').exists()).toBe(false)
    expect(wrapper.find('[data-testid="team-shared-review-list"] [data-testid="shared-weekly-review-summary"]').text()).toBe(
      '共享摘要 review-1',
    )
  })
})
