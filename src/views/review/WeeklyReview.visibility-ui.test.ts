import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import WeeklyReview from './WeeklyReview.vue'
import type { WeeklyReviewDetailWire } from '@/types/review'

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
  getReviewDetailApi: vi.fn(),
  saveWeeklyReviewApi: vi.fn(),
  updateWeeklyReviewApi: vi.fn(),
}))
const projectApi = vi.hoisted(() => ({ fetchProjectList: vi.fn() }))
const taskApi = vi.hoisted(() => ({ fetchTaskList: vi.fn() }))
const aiApi = vi.hoisted(() => ({ aiPolishApi: vi.fn() }))
const collaborationStore = vi.hoisted(() => ({
  currentUser: { id: '1', username: '当前用户' },
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
  completedTaskCount: 0,
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

const mountPage = async (current: WeeklyReviewDetailWire = currentFixture()) => {
  reviewApi.fetchCurrentReview.mockResolvedValue(current)
  reviewApi.fetchReviewHistory.mockResolvedValue([])
  reviewApi.saveWeeklyReviewApi.mockResolvedValue(undefined)
  reviewApi.updateWeeklyReviewApi.mockResolvedValue(undefined)
  projectApi.fetchProjectList.mockResolvedValue({ records: [] })
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
    expect(reviewApi.fetchCurrentReview).toHaveBeenCalled()
    expect(wrapper.get('[data-testid="review-visibility-fields"]')).toBeTruthy()
  })
  return wrapper
}

const clickSave = async (wrapper: ReturnType<typeof mount>) => {
  const button = wrapper.findAll('button').find((candidate) => candidate.text().includes('保存本周总结'))
  if (!button) throw new Error('missing weekly review save button')
  await button.trigger('click')
}

const confirmSave = async (wrapper: ReturnType<typeof mount>) => {
  const button = wrapper.findAll('button').find((candidate) => (
    candidate.text().includes('保存私人复盘') || candidate.text().includes('保存并共享摘要')
  ))
  if (!button) throw new Error('missing weekly review confirmation button')
  await button.trigger('click')
}

describe('WeeklyReview D2 visibility UI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
  })

  it('PR7-T-030/031 saves a new review PRIVATE with an explicit null team', async () => {
    const wrapper = await mountPage()
    expect((wrapper.get('[data-testid="review-visibility-private"]').element as HTMLInputElement).checked).toBe(true)

    await wrapper.get('textarea[placeholder^="可选补充内容"]').setValue('私人复盘正文')
    await clickSave(wrapper)
    expect(wrapper.text()).toContain('确认保存为私人复盘？')
    await confirmSave(wrapper)

    await vi.waitFor(() => {
      expect(reviewApi.saveWeeklyReviewApi).toHaveBeenCalledWith({
        year: 2026,
        weekNo: 36,
        visibilityScope: 'PRIVATE',
        teamId: null,
        focusProjectId: null,
        reflection: '私人复盘正文',
        nextPlan: '',
        sharedSummary: '',
        taskIds: [],
      })
    })
  })

  it('PR7-T-032 blocks TEAM submission without a selected team', async () => {
    const wrapper = await mountPage()
    await wrapper.get('[data-testid="review-visibility-team"]').setValue(true)
    await wrapper.get('[data-testid="review-shared-summary"]').setValue('团队摘要')
    await clickSave(wrapper)

    expect(wrapper.get('[data-testid="review-team-error"]').text()).toContain('请选择')
    expect(reviewApi.saveWeeklyReviewApi).not.toHaveBeenCalled()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('PR7-T-033 blocks TEAM submission with a blank shared summary', async () => {
    const wrapper = await mountPage()
    await wrapper.get('[data-testid="review-visibility-team"]').setValue(true)
    await wrapper.get('[data-testid="review-team-select"]').setValue('7')
    await wrapper.get('[data-testid="review-shared-summary"]').setValue('   ')
    await clickSave(wrapper)

    expect(wrapper.get('[data-testid="review-summary-error"]').text()).toContain('共享摘要')
    expect(reviewApi.saveWeeklyReviewApi).not.toHaveBeenCalled()
  })

  it('saves a valid TEAM review with the selected team and trimmed summary', async () => {
    const wrapper = await mountPage()
    await wrapper.get('[data-testid="review-visibility-team"]').setValue(true)
    await wrapper.get('[data-testid="review-team-select"]').setValue('7')
    await wrapper.get('[data-testid="review-shared-summary"]').setValue('  本周完成联调  ')
    await clickSave(wrapper)

    expect(wrapper.text()).toContain('确认向「研发组」共享摘要？')
    await confirmSave(wrapper)
    await vi.waitFor(() => {
      expect(reviewApi.saveWeeklyReviewApi).toHaveBeenCalledWith(expect.objectContaining({
        visibilityScope: 'TEAM',
        teamId: '7',
        sharedSummary: '本周完成联调',
      }))
    })
  })

  it('PR7-T-034 clears TEAM A associations before updating TEAM B', async () => {
    const wrapper = await mountPage(currentFixture({
      id: '31',
      visibilityScope: 'TEAM',
      teamId: '7',
      focusProjectId: '9',
      sharedSummary: '原摘要',
      taskIds: ['11', '12'],
    }))

    await wrapper.get('[data-testid="review-team-select"]').setValue('8')
    await clickSave(wrapper)
    await confirmSave(wrapper)

    await vi.waitFor(() => {
      expect(reviewApi.updateWeeklyReviewApi).toHaveBeenCalledWith(expect.objectContaining({
        id: '31',
        visibilityScope: 'TEAM',
        teamId: '8',
        focusProjectId: null,
        taskIds: [],
      }))
    })
  })

  it('keeps PRIVATE saving available when team context loading fails', async () => {
    collaborationStore.teams = []
    collaborationStore.teamsLoadState.status = 'error'
    collaborationStore.teamsLoadState.errorMessage = '团队加载失败'

    const wrapper = await mountPage()
    await wrapper.get('textarea[placeholder^="可选补充内容"]').setValue('仍可保存的私人正文')
    await clickSave(wrapper)
    await confirmSave(wrapper)

    await vi.waitFor(() => {
      expect(reviewApi.saveWeeklyReviewApi).toHaveBeenCalledWith(expect.objectContaining({
        visibilityScope: 'PRIVATE',
        teamId: null,
        reflection: '仍可保存的私人正文',
      }))
    })
  })

  it('fails a removed TEAM target closed without discarding authored text', async () => {
    collaborationStore.teams = [
      { id: '8', ownerId: '2', name: '产品组', description: '', role: 'ADMIN' },
    ]

    const wrapper = await mountPage(currentFixture({
      id: '31',
      visibilityScope: 'TEAM',
      teamId: '7',
      focusProjectId: '9',
      reflection: '保留的私人正文',
      nextPlan: '保留的下周计划',
      sharedSummary: '保留的摘要草稿',
      taskIds: ['11'],
    }))

    await vi.waitFor(() => {
      expect((wrapper.get('[data-testid="review-team-select"]').element as HTMLSelectElement).value).toBe('')
      expect(wrapper.get('[data-testid="review-team-error"]').text()).toContain('请选择')
    })
    expect((wrapper.get('textarea[placeholder^="可选补充内容"]').element as HTMLTextAreaElement).value)
      .toBe('保留的私人正文')
    expect((wrapper.get('[data-testid="review-shared-summary"]').element as HTMLTextAreaElement).value)
      .toBe('保留的摘要草稿')
  })
})
