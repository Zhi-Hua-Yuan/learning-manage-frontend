import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ReviewVisibilityFields from './ReviewVisibilityFields.vue'
import type { TeamContext } from '@/types/team'

const teams: TeamContext[] = [
  { id: '7', ownerId: '1', name: '研发组', description: '', role: 'MEMBER' },
  { id: '8', ownerId: '2', name: '产品组', description: '', role: 'ADMIN' },
]

const mountFields = (props: Record<string, unknown> = {}) => mount(ReviewVisibilityFields, {
  props: {
    visibilityScope: 'PRIVATE',
    teamId: null,
    sharedSummary: '',
    teams,
    ...props,
  },
})

describe('ReviewVisibilityFields', () => {
  it('renders PRIVATE as the default accessible choice', () => {
    const wrapper = mountFields()
    const privateRadio = wrapper.get('[data-testid="review-visibility-private"]')

    expect((privateRadio.element as HTMLInputElement).checked).toBe(true)
    expect(wrapper.get('[data-testid="review-private-notice"]').text()).toContain('仅自己可见')
    expect(wrapper.find('[data-testid="review-team-fields"]').exists()).toBe(false)
  })

  it('emits a TEAM transition from a native keyboard-operable radio', async () => {
    const wrapper = mountFields()
    await wrapper.get('[data-testid="review-visibility-team"]').setValue(true)
    expect(wrapper.emitted('update:visibilityScope')?.[0]).toEqual(['TEAM'])
  })

  it('renders the frozen TEAM privacy notice and emits team and summary edits', async () => {
    const wrapper = mountFields({ visibilityScope: 'TEAM' })

    expect(wrapper.get('[data-testid="review-team-privacy-notice"]').text()).toBe(
      '仅向所选团队共享摘要。本周复盘、下周计划和关联任务仍然只有你自己可见。',
    )
    await wrapper.get('[data-testid="review-team-select"]').setValue('8')
    await wrapper.get('[data-testid="review-shared-summary"]').setValue('<b>纯文本摘要</b>')

    expect(wrapper.emitted('update:teamId')?.[0]).toEqual(['8'])
    expect(wrapper.emitted('update:sharedSummary')?.[0]).toEqual(['<b>纯文本摘要</b>'])
    expect(wrapper.find('b').exists()).toBe(false)
  })

  it('associates TEAM validation messages with their fields', () => {
    const wrapper = mountFields({
      visibilityScope: 'TEAM',
      issues: [
        { field: 'teamId', code: 'TEAM_REQUIRED' },
        { field: 'sharedSummary', code: 'SHARED_SUMMARY_REQUIRED' },
      ],
    })

    const teamSelect = wrapper.get('[data-testid="review-team-select"]')
    const summary = wrapper.get('[data-testid="review-shared-summary"]')
    expect(teamSelect.attributes('aria-invalid')).toBe('true')
    expect(teamSelect.attributes('aria-describedby')).toContain(
      wrapper.get('[data-testid="review-team-error"]').attributes('id'),
    )
    expect(summary.attributes('aria-invalid')).toBe('true')
    expect(summary.attributes('aria-describedby')).toContain(
      wrapper.get('[data-testid="review-summary-error"]').attributes('id'),
    )
  })

  it('fails TEAM selection closed when no teams are available and supports retry', async () => {
    const wrapper = mountFields({
      visibilityScope: 'TEAM',
      teams: [],
      teamsError: '团队加载失败，请稍后重试。',
    })

    expect(wrapper.get('[data-testid="review-team-select"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-testid="review-team-retry"]').trigger('click')
    expect(wrapper.emitted('retryTeams')).toHaveLength(1)
  })

  it('disables stale team choices while the team context is in error', () => {
    const wrapper = mountFields({
      visibilityScope: 'TEAM',
      teamsError: '团队上下文已失效。',
    })
    expect(wrapper.get('[data-testid="review-team-select"]').attributes('disabled')).toBeDefined()
  })

  it('shows a non-blocking live character count without inventing an unfrozen limit', () => {
    const wrapper = mountFields({ visibilityScope: 'TEAM', sharedSummary: '团队摘要' })
    expect(wrapper.get('[data-testid="review-summary-count"]').text()).toBe('当前 4 字')
    expect(wrapper.get('[data-testid="review-shared-summary"]').attributes('maxlength')).toBeUndefined()
  })

  it('fails an unknown visibility value closed', () => {
    const wrapper = mountFields({ visibilityScope: 'UNKNOWN' })
    expect(wrapper.get('[data-testid="review-visibility-unknown"]').text()).toContain('可见性异常')
    expect((wrapper.get('[data-testid="review-visibility-private"]').element as HTMLInputElement).checked).toBe(false)
    expect((wrapper.get('[data-testid="review-visibility-team"]').element as HTMLInputElement).checked).toBe(false)
  })
})
