import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import WeeklyReview from './WeeklyReview.vue'
import type { ProjectContext, ProjectWire } from '@/types/project'
import type { WeeklyReviewDetailWire } from '@/types/review'
import type { TaskWire } from '@/types/task'
import { ApiRequestError } from '@/utils/request'
import { useToastStore } from '@/stores/toast'

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
const projectApi = vi.hoisted(() => ({
  fetchProjectList: vi.fn(),
  fetchTeamProjectsApi: vi.fn(),
}))
const taskApi = vi.hoisted(() => ({ fetchTaskList: vi.fn() }))
const aiApi = vi.hoisted(() => ({ aiPolishApi: vi.fn() }))
const collaborationStore = vi.hoisted(() => ({
  currentUser: { id: '1', username: '当前用户' },
  sessionEpoch: 0,
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
  id: '31',
  authorUserId: '1',
  year: 2026,
  weekNo: 36,
  startDate: '',
  endDate: '',
  completedTaskCount: 0,
  visibilityScope: 'PRIVATE',
  teamId: null,
  focusProjectId: null,
  focusProjectName: null,
  sharedSummary: '',
  reflection: '私人复盘正文',
  nextPlan: '下周计划',
  taskIds: [],
  ...overrides,
})

const projectWire = (
  id: string,
  scope: 'PERSONAL' | 'TEAM' = 'PERSONAL',
  teamId: string | null = null,
): ProjectWire => ({
  id,
  userId: '1',
  teamId,
  name: `项目 ${id}`,
  goal: '',
  scope,
  status: 0,
  orderNo: 1,
})

const projectContext = (
  id: string,
  scope: 'PERSONAL' | 'TEAM' = 'TEAM',
  teamId: string | null = '7',
): ProjectContext => ({
  id,
  ownerUserId: '1',
  teamId,
  name: `项目 ${id}`,
  goal: '',
  scope,
  status: 0,
  orderNo: 1,
  icon: null,
  color: null,
  startDate: null,
  endDate: null,
  createTime: null,
  updateTime: null,
})

const taskWire = (
  id: string,
  projectId = '10',
  overrides: Partial<TaskWire> = {},
): TaskWire => ({
  id,
  projectId,
  createdByUserId: '1',
  assigneeUserId: '1',
  assignedByUserId: '1',
  title: `任务 ${id}`,
  status: 0,
  priority: 1,
  capabilities: {},
  ...overrides,
})

const page = <T,>(records: T[]) => ({
  records,
  current: 1,
  size: 100,
  total: records.length,
})

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

const mountPage = async (current: WeeklyReviewDetailWire) => {
  reviewApi.fetchCurrentReview.mockResolvedValue(current)
  reviewApi.fetchReviewHistory.mockResolvedValue([])
  reviewApi.saveWeeklyReviewApi.mockResolvedValue(undefined)
  reviewApi.updateWeeklyReviewApi.mockResolvedValue(undefined)
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
    expect(wrapper.get('[data-testid="review-association-picker"]')).toBeTruthy()
    expect((wrapper.get('textarea[placeholder^="可选补充内容"]').element as HTMLTextAreaElement).value)
      .toBe(typeof current.reflection === 'string' ? current.reflection : '')
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

describe('WeeklyReview D3-2 association integration', () => {
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
    projectApi.fetchProjectList.mockResolvedValue(page([]))
    projectApi.fetchTeamProjectsApi.mockResolvedValue(page([]))
    taskApi.fetchTaskList.mockResolvedValue(page([]))
    aiApi.aiPolishApi.mockResolvedValue('{"review":"AI 润色结果"}')
  })

  it('D4-1 saves an author draft through the typed API and reloads canonical server state', async () => {
    const wrapper = await mountPage(currentFixture({
      id: null,
      reflection: '本地草稿',
      taskIds: ['101'],
    }))
    reviewApi.fetchCurrentReview.mockResolvedValueOnce(currentFixture({
      id: '41',
      reflection: '服务端规范化后的正文',
      taskIds: ['102'],
    }))

    await clickSave(wrapper)
    await confirmSave(wrapper)

    await vi.waitFor(() => {
      expect(reviewApi.saveWeeklyReviewApi).toHaveBeenCalledWith(expect.objectContaining({
        year: 2026,
        weekNo: 36,
        visibilityScope: 'PRIVATE',
        teamId: null,
        reflection: '本地草稿',
        taskIds: ['101'],
      }))
      expect(reviewApi.updateWeeklyReviewApi).not.toHaveBeenCalled()
      expect(reviewApi.fetchCurrentReview).toHaveBeenCalledTimes(2)
      expect(reviewApi.fetchReviewHistory).toHaveBeenCalledTimes(2)
    })

    await vi.waitFor(() => {
      expect((wrapper.get('textarea[placeholder^="可选补充内容"]').element as HTMLTextAreaElement).value)
        .toBe('服务端规范化后的正文')
      expect(wrapper.get('[data-testid="review-selected-tasks"]').text()).toContain('任务 #102')
      expect(wrapper.get('[data-testid="review-selected-tasks"]').text()).not.toContain('任务 #101')
    })
  })

  it('D4-1 reports a completed mutation separately when the authoritative refresh fails', async () => {
    const wrapper = await mountPage(currentFixture({ id: null, reflection: '等待保存的草稿' }))
    const toastStore = useToastStore()
    reviewApi.fetchCurrentReview.mockRejectedValueOnce(new Error('refresh failed'))

    await clickSave(wrapper)
    await confirmSave(wrapper)

    await vi.waitFor(() => {
      expect(reviewApi.saveWeeklyReviewApi).toHaveBeenCalledTimes(1)
      expect(reviewApi.fetchCurrentReview).toHaveBeenCalledTimes(2)
      expect(reviewApi.fetchReviewHistory).toHaveBeenCalledTimes(1)
      expect(toastStore.toasts.some((toast) => (
        toast.type === 'warning'
        && toast.message === '保存已完成，但最新内容加载失败，请刷新页面后确认。'
      ))).toBe(true)
    })
    expect(reviewApi.updateWeeklyReviewApi).not.toHaveBeenCalled()
  })

  it('PR7-T-034 clears TEAM A associations before loading B and drops A late data', async () => {
    let resolveTeamA!: (projects: ProjectContext[]) => void
    const teamAResponse = new Promise<ProjectContext[]>((resolve) => {
      resolveTeamA = resolve
    })
    collaborationStore.ensureTeamProjects.mockImplementation((teamId: string) => (
      teamId === '7'
        ? teamAResponse
        : Promise.resolve([projectContext('80', 'TEAM', '8')])
    ))

    const wrapper = await mountPage(currentFixture({
      visibilityScope: 'TEAM',
      teamId: '7',
      focusProjectId: '70',
      sharedSummary: '团队共享摘要',
      taskIds: ['701'],
    }))

    expect(wrapper.get('[data-testid="review-task-count"]').text()).toContain('1 / 500')
    await wrapper.get('[data-testid="review-team-select"]').setValue('8')

    expect(wrapper.get('[data-testid="review-task-count"]').text()).toContain('0 / 500')
    expect((wrapper.get('[data-testid="review-focus-project-select"]').element as HTMLSelectElement).value).toBe('')

    await vi.waitFor(() => {
      expect(collaborationStore.ensureTeamProjects).toHaveBeenCalledWith('8', { force: false })
      expect(wrapper.get('[data-testid="review-focus-project-select"]').text()).toContain('项目 80')
    })

    resolveTeamA([projectContext('70', 'TEAM', '7')])
    await Promise.resolve()
    await Promise.resolve()
    expect(wrapper.get('[data-testid="review-focus-project-select"]').text()).not.toContain('项目 70')

    await clickSave(wrapper)
    await confirmSave(wrapper)
    await vi.waitFor(() => {
      expect(reviewApi.updateWeeklyReviewApi).toHaveBeenCalledWith(expect.objectContaining({
        id: '31',
        teamId: '8',
        focusProjectId: null,
        taskIds: [],
      }))
    })
  })

  it('PR7-T-035 blocks the 501st task and preserves a 500-item payload snapshot', async () => {
    const selectedTaskIds = Array.from({ length: 500 }, (_, index) => String(index + 1))
    projectApi.fetchProjectList.mockResolvedValue(page([projectWire('10')]))
    taskApi.fetchTaskList.mockResolvedValue(page([taskWire('501')]))

    const wrapper = await mountPage(currentFixture({
      focusProjectId: '10',
      taskIds: selectedTaskIds,
    }))

    await vi.waitFor(() => {
      expect(wrapper.get('[data-testid="review-task-project-select"]').findAll('option')).toHaveLength(2)
    })
    await wrapper.get('[data-testid="review-task-project-select"]').setValue('10')
    await vi.waitFor(() => {
      expect(taskApi.fetchTaskList).toHaveBeenCalledWith({ projectId: '10', current: 1, size: 100 })
    })
    await Promise.all(taskApi.fetchTaskList.mock.results.map((result) => result.value))
    await wrapper.vm.$nextTick()
    await vi.waitFor(() => {
      expect(wrapper.get('input[data-task-id="501"]').attributes('disabled')).toBeDefined()
    })

    ;(wrapper.get('input[data-task-id="501"]').element as HTMLInputElement).click()
    expect(wrapper.get('[data-testid="review-task-count"]').text()).toContain('500 / 500')

    await clickSave(wrapper)
    await wrapper.get('button[data-remove-task-id="1"]').trigger('click')
    expect(wrapper.get('[data-testid="review-task-count"]').text()).toContain('499 / 500')
    await confirmSave(wrapper)
    await vi.waitFor(() => {
      const payload = reviewApi.updateWeeklyReviewApi.mock.calls[0]?.[0]
      expect(payload.taskIds).toHaveLength(500)
      expect(payload.taskIds).toContain('1')
      expect(payload.taskIds).not.toContain('501')
    })
  })

  it('PR7-T-039 never restores associations omitted by the latest author detail', async () => {
    projectApi.fetchProjectList.mockResolvedValue(page([projectWire('10')]))
    taskApi.fetchTaskList.mockResolvedValue(page([taskWire('101'), taskWire('102')]))

    const wrapper = await mountPage(currentFixture({
      focusProjectId: null,
      taskIds: ['101'],
    }))

    await vi.waitFor(() => {
      expect(wrapper.get('[data-testid="review-task-project-select"]').findAll('option')).toHaveLength(2)
    })
    await wrapper.get('[data-testid="review-task-project-select"]').setValue('10')
    await vi.waitFor(() => {
      expect(taskApi.fetchTaskList).toHaveBeenCalledWith({ projectId: '10', current: 1, size: 100 })
    })
    await Promise.all(taskApi.fetchTaskList.mock.results.map((result) => result.value))
    await wrapper.vm.$nextTick()
    await vi.waitFor(() => {
      expect(wrapper.findAll('[data-task-id]')).toHaveLength(2)
    })

    expect((wrapper.get('input[data-task-id="101"]').element as HTMLInputElement).checked).toBe(true)
    expect((wrapper.get('input[data-task-id="102"]').element as HTMLInputElement).checked).toBe(false)
    expect((wrapper.get('[data-testid="review-focus-project-select"]').element as HTMLSelectElement).value).toBe('')

    await clickSave(wrapper)
    await confirmSave(wrapper)
    await vi.waitFor(() => {
      expect(reviewApi.updateWeeklyReviewApi).toHaveBeenCalledWith(expect.objectContaining({
        focusProjectId: null,
        taskIds: ['101'],
      }))
    })
  })

  it('keeps authored content and authoritative IDs when candidate access is lost', async () => {
    projectApi.fetchProjectList.mockRejectedValueOnce(
      new ApiRequestError('forbidden', { code: 40300, httpStatus: 403 }),
    )

    const wrapper = await mountPage(currentFixture({
      reflection: '不能丢失的私人正文',
      nextPlan: '不能丢失的下周计划',
      taskIds: ['101'],
    }))

    await vi.waitFor(() => {
      expect(wrapper.get('[data-testid="review-association-access-message"]').text()).toContain('权限已变化')
    })
    expect((wrapper.get('textarea[placeholder^="可选补充内容"]').element as HTMLTextAreaElement).value)
      .toBe('不能丢失的私人正文')
    expect(wrapper.get('[data-testid="review-task-count"]').text()).toContain('1 / 500')
    expect(wrapper.get('[data-testid="review-selected-tasks"]').text()).toContain('任务 #101')
  })

  it('D4-3 sends explicit review task associations without mixing automatic candidates', async () => {
    const wrapper = await mountPage(currentFixture({
      reflection: '需要润色的正文',
      taskIds: ['101', '102'],
    }))

    await wrapper.get('[data-testid="weekly-review-ai-polish"]').trigger('click')

    await vi.waitFor(() => {
      expect(aiApi.aiPolishApi).toHaveBeenCalledTimes(1)
      expect(aiApi.aiPolishApi).toHaveBeenCalledWith({
        taskIds: ['101', '102'],
        reflection: '需要润色的正文',
      })
      expect((wrapper.get('textarea[placeholder^="可选补充内容"]').element as HTMLTextAreaElement).value)
        .toBe('AI 润色结果')
    })
  })

  it('D4-3 uses only current-user tasks completed in the review week as fallback', async () => {
    projectApi.fetchProjectList.mockResolvedValue(page([projectWire('10')]))
    taskApi.fetchTaskList.mockResolvedValue(page([
      taskWire('101', '10', {
        status: 2,
        dueDate: '2026-09-02',
        completedAt: '2026-09-03T09:00:00+08:00',
      }),
      taskWire('102', '10', {
        assigneeUserId: '2',
        status: 2,
        dueDate: '2026-09-02',
        completedAt: '2026-09-03T09:00:00+08:00',
      }),
      taskWire('103', '10', {
        status: 2,
        dueDate: '2026-09-02',
        completedAt: '2026-08-20T09:00:00+08:00',
      }),
      taskWire('104', '10', {
        status: 0,
        dueDate: '2026-09-02',
        completedAt: '2026-09-03T09:00:00+08:00',
      }),
    ]))
    const wrapper = await mountPage(currentFixture({
      startDate: '2026-08-31',
      endDate: '2026-09-06',
      reflection: '自动候选正文',
      taskIds: [],
    }))

    await vi.waitFor(() => {
      expect(taskApi.fetchTaskList).toHaveBeenCalled()
      expect(wrapper.text()).toContain('66.7%')
    })
    await wrapper.get('[data-testid="weekly-review-ai-polish"]').trigger('click')

    await vi.waitFor(() => {
      expect(aiApi.aiPolishApi).toHaveBeenCalledWith({
        taskIds: ['101'],
        reflection: '自动候选正文',
      })
    })
  })

  it('D4-3 refreshes association candidates after authorization failure without partial retry', async () => {
    aiApi.aiPolishApi.mockRejectedValueOnce(
      new ApiRequestError('forbidden', { code: 40300, httpStatus: 403 }),
    )
    const wrapper = await mountPage(currentFixture({
      reflection: '不能丢失的私人正文',
      taskIds: ['101', '102'],
    }))
    const projectCallsBeforePolish = projectApi.fetchProjectList.mock.calls.length

    await wrapper.get('[data-testid="weekly-review-ai-polish"]').trigger('click')

    await vi.waitFor(() => {
      expect(aiApi.aiPolishApi).toHaveBeenCalledTimes(1)
      expect(projectApi.fetchProjectList.mock.calls.length).toBeGreaterThan(projectCallsBeforePolish)
      expect(wrapper.get('[data-testid="review-association-access-message"]').text())
        .toContain('请重新确认')
    })
    expect((wrapper.get('textarea[placeholder^="可选补充内容"]').element as HTMLTextAreaElement).value)
      .toBe('不能丢失的私人正文')
  })

  it('D4-3 discards a successful response after the review context changes', async () => {
    const pending = deferred<string>()
    aiApi.aiPolishApi.mockReturnValueOnce(pending.promise)
    const wrapper = await mountPage(currentFixture({
      reflection: '用户当前正文',
      taskIds: ['101'],
    }))

    await wrapper.get('[data-testid="weekly-review-ai-polish"]').trigger('click')
    await vi.waitFor(() => expect(aiApi.aiPolishApi).toHaveBeenCalledTimes(1))
    await wrapper.get('[data-testid="review-visibility-team"]').setValue(true)
    pending.resolve('{"review":"不应覆盖的新结果"}')

    await vi.waitFor(() => {
      expect((wrapper.get('textarea[placeholder^="可选补充内容"]').element as HTMLTextAreaElement).value)
        .toBe('用户当前正文')
      expect(useToastStore().toasts.some((item) => item.message.includes('结果未自动应用'))).toBe(true)
    })
  })

  it('D4-3 preserves authored text when the AI response is malformed', async () => {
    aiApi.aiPolishApi.mockResolvedValueOnce('raw model output')
    const wrapper = await mountPage(currentFixture({
      reflection: '必须保留的正文',
      taskIds: ['101'],
    }))

    await wrapper.get('[data-testid="weekly-review-ai-polish"]').trigger('click')

    await vi.waitFor(() => {
      expect((wrapper.get('textarea[placeholder^="可选补充内容"]').element as HTMLTextAreaElement).value)
        .toBe('必须保留的正文')
      expect(useToastStore().toasts.some((item) => item.message.includes('AI 返回格式异常'))).toBe(true)
    })
  })
})
