import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import WeeklyReview from './WeeklyReview.vue'
import type { SharedWeeklyReviewWire, WeeklyReviewDetailWire } from '@/types/review'

const router = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  beforeEach: vi.fn(),
  currentRoute: { value: { path: '/review' } },
}))

const reviewApi = vi.hoisted(() => ({
  deleteReviewApi: vi.fn(),
  fetchCurrentReview: vi.fn(),
  fetchReviewHistory: vi.fn(),
  fetchTeamSharedReviewsApi: vi.fn(),
  getReviewDetailApi: vi.fn(),
  saveWeeklyReviewApi: vi.fn(),
  updateWeeklyReviewApi: vi.fn(),
}))

const projectApi = vi.hoisted(() => ({
  fetchProjectList: vi.fn(),
  fetchTeamProjectsApi: vi.fn(),
}))

const taskApi = vi.hoisted(() => ({ fetchTaskList: vi.fn() }))
const aiApi = vi.hoisted(() => ({ aiPolishApi: vi.fn() }))

const collaborationStore = vi.hoisted(() => ({
  currentUser: { id: '1', username: '当前用户' },
  sessionEpoch: 1,
  teams: [
    { id: '7', ownerId: '1', name: '研发组', description: '', role: 'MEMBER' },
    { id: '8', ownerId: '2', name: '产品组', description: '', role: 'ADMIN' },
  ],
  teamsLoadState: {
    status: 'ready' as 'idle' | 'loading' | 'ready' | 'error',
    errorKind: null,
    errorMessage: null as string | null,
  },
  bootstrapCollaborationContext: vi.fn(),
  refreshMyTeams: vi.fn(),
  ensureTeamProjects: vi.fn(),
  loadMoreTeamProjects: vi.fn(),
  getTeamProjects: vi.fn(),
  getTeam: vi.fn(),
  pruneTeamContext: vi.fn(),
}))

vi.mock('vue-router', () => ({
  createRouter: () => router,
  createWebHistory: () => ({}),
  useRouter: () => router,
}))
vi.mock('@/api/review', () => reviewApi)
vi.mock('@/api/project', () => projectApi)
vi.mock('@/api/task', () => taskApi)
vi.mock('@/api/ai', () => aiApi)
vi.mock('@/stores/collaboration', () => ({
  useCollaborationStore: () => collaborationStore,
}))

const currentFixture = (overrides: Partial<WeeklyReviewDetailWire> = {}): WeeklyReviewDetailWire => ({
  id: null,
  authorUserId: '1',
  year: 2026,
  weekNo: 36,
  startDate: '2026-08-31',
  endDate: '2026-09-06',
  completedTaskCount: 2,
  visibilityScope: 'PRIVATE',
  teamId: null,
  focusProjectId: null,
  focusProjectName: null,
  sharedSummary: '',
  reflection: '',
  nextPlan: '',
  taskIds: [],
  ...overrides,
})

const sharedReview = (overrides: Partial<SharedWeeklyReviewWire> = {}): SharedWeeklyReviewWire => ({
  id: '501',
  author: { id: '2', username: '团队成员' },
  year: 2026,
  weekNo: 36,
  startDate: '2026-08-31',
  endDate: '2026-09-06',
  focusProject: { id: '91', name: '协作项目' },
  sharedSummary: '已完成接口联调',
  createTime: '2026-09-01T10:00:00',
  updateTime: '2026-09-01T10:00:00',
  ...overrides,
})

const mountPage = async () => {
  reviewApi.fetchCurrentReview.mockResolvedValue(currentFixture())
  reviewApi.fetchReviewHistory.mockResolvedValue([])
  reviewApi.fetchTeamSharedReviewsApi.mockResolvedValue({
    records: [sharedReview()],
    current: 1,
    size: 20,
    total: 1,
  })
  reviewApi.saveWeeklyReviewApi.mockResolvedValue(undefined)
  reviewApi.updateWeeklyReviewApi.mockResolvedValue(undefined)
  projectApi.fetchProjectList.mockResolvedValue({ records: [] })
  projectApi.fetchTeamProjectsApi.mockResolvedValue({ records: [] })
  taskApi.fetchTaskList.mockResolvedValue({ records: [] })
  collaborationStore.bootstrapCollaborationContext.mockResolvedValue({
    currentUser: collaborationStore.currentUser,
    teams: collaborationStore.teams,
  })

  const wrapper = mount(WeeklyReview, {
    global: {
      plugins: [createPinia()],
      stubs: { AppIcon: true, Transition: false },
    },
  })

  await vi.waitFor(() => {
    expect(wrapper.get('[data-testid="weekly-review-mine-tab"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.get('[data-testid="review-visibility-fields"]')).toBeTruthy()
  })

  return wrapper
}

describe('WeeklyReview D5-4 shared feed integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    collaborationStore.currentUser = { id: '1', username: '当前用户' }
    collaborationStore.sessionEpoch = 1
    collaborationStore.teams = [
      { id: '7', ownerId: '1', name: '研发组', description: '', role: 'MEMBER' },
      { id: '8', ownerId: '2', name: '产品组', description: '', role: 'ADMIN' },
    ]
    collaborationStore.teamsLoadState.status = 'ready'
    collaborationStore.teamsLoadState.errorMessage = null
    collaborationStore.getTeam.mockImplementation((id: string) => (
      collaborationStore.teams.find((team) => team.id === id) ?? null
    ))
    collaborationStore.ensureTeamProjects.mockResolvedValue([])
    collaborationStore.loadMoreTeamProjects.mockResolvedValue([])
    collaborationStore.getTeamProjects.mockReturnValue([])
    collaborationStore.refreshMyTeams.mockResolvedValue(collaborationStore.teams)
  })

  it('defaults to 我的复盘 and does not load team reviews before selection', async () => {
    const wrapper = await mountPage()

    expect(wrapper.get('[data-testid="weekly-review-mine-tab"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.find('[data-testid="team-shared-review-feed"]').exists()).toBe(false)
    expect(reviewApi.fetchTeamSharedReviewsApi).not.toHaveBeenCalled()
  })

  it('switches to the team feed without losing an unsaved author draft', async () => {
    const wrapper = await mountPage()
    const reflection = wrapper.get('textarea[placeholder^="可选补充内容"]')
    await reflection.setValue('尚未提交的私人正文')

    await wrapper.get('[data-testid="weekly-review-team-tab"]').trigger('click')

    expect(wrapper.get('[data-testid="team-shared-review-feed"]')).toBeTruthy()
    expect(wrapper.find('[data-testid="review-visibility-fields"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="weekly-review-ai-polish"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="weekly-review-delete"]').exists()).toBe(false)

    await wrapper.get('[data-testid="weekly-review-mine-tab"]').trigger('click')
    expect((wrapper.get('textarea[placeholder^="可选补充内容"]').element as HTMLTextAreaElement).value)
      .toBe('尚未提交的私人正文')
  })

  it('loads only /review/team after selecting a team and keeps the shared card read-only', async () => {
    const wrapper = await mountPage()
    await wrapper.get('[data-testid="weekly-review-team-tab"]').trigger('click')
    await wrapper.get('[data-testid="team-shared-review-team-select"]').setValue('7')

    await vi.waitFor(() => {
      expect(reviewApi.fetchTeamSharedReviewsApi).toHaveBeenCalledWith({ teamId: '7', current: 1, size: 20 })
      expect(wrapper.get('[data-testid="shared-weekly-review-card"]')).toBeTruthy()
    })

    expect(wrapper.get('[data-testid="shared-weekly-review-summary"]').text()).toContain('已完成接口联调')
    expect(wrapper.find('[data-testid="shared-weekly-review-card"] button').exists()).toBe(false)
    expect(wrapper.text()).not.toMatch(/修改|删除|导出 MD|AI 润色复盘/)
    expect(reviewApi.getReviewDetailApi).not.toHaveBeenCalled()
    expect(reviewApi.updateWeeklyReviewApi).not.toHaveBeenCalled()
    expect(reviewApi.deleteReviewApi).not.toHaveBeenCalled()
  })

  it('does not mix the author team target with the shared feed team selection', async () => {
    const wrapper = await mountPage()
    await wrapper.get('[data-testid="review-visibility-team"]').setValue(true)
    await wrapper.get('[data-testid="review-team-select"]').setValue('8')
    await wrapper.get('[data-testid="weekly-review-team-tab"]').trigger('click')
    await wrapper.get('[data-testid="team-shared-review-team-select"]').setValue('7')

    await wrapper.get('[data-testid="weekly-review-mine-tab"]').trigger('click')
    expect((wrapper.get('[data-testid="review-team-select"]').element as HTMLSelectElement).value).toBe('8')
  })

  it('clears the shared page state on unmount and ignores a late response', async () => {
    let resolveReviews: ((value: unknown) => void) | undefined
    reviewApi.fetchTeamSharedReviewsApi.mockImplementationOnce(() => new Promise((resolve) => {
      resolveReviews = resolve
    }))

    const wrapper = await mountPage()
    await wrapper.get('[data-testid="weekly-review-team-tab"]').trigger('click')
    await wrapper.get('[data-testid="team-shared-review-team-select"]').setValue('7')
    wrapper.unmount()
    resolveReviews?.({ records: [sharedReview()], current: 1, size: 20, total: 1 })
    await Promise.resolve()

    expect(wrapper.find('[data-testid="shared-weekly-review-card"]').exists()).toBe(false)
  })
})
