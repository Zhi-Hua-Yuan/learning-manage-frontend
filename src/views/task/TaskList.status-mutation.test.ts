import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia } from 'pinia'

import TaskList from './TaskList.vue'
import { ApiRequestError } from '@/utils/request'
import { resetProtectedSessionState } from '@/utils/sessionLifecycle'

const { route, router } = vi.hoisted(() => ({
  route: {
    query: { teamId: '10', projectId: '1' } as Record<string, string>,
    path: '/tasks',
  },
  router: {
    push: vi.fn(),
    replace: vi.fn(),
    beforeEach: vi.fn(),
  },
}))

const taskApi = vi.hoisted(() => ({
  addTaskApi: vi.fn(),
  assignTaskApi: vi.fn(),
  changeTaskStatusApi: vi.fn(),
  deleteTaskApi: vi.fn(),
  fetchTaskList: vi.fn(),
  fetchTaskAssignmentHistoryApi: vi.fn(),
  updateTaskContentApi: vi.fn(),
}))

const collaborationStore = vi.hoisted(() => ({
  currentUser: { id: '1', username: '所有者' },
  teamMembersByTeamId: {},
  ensureTeamMembers: vi.fn(),
  getTeam: vi.fn(() => ({
    id: '10',
    ownerId: '1',
    name: '测试团队',
    description: '',
    role: 'OWNER',
  })),
  getTeamProjects: vi.fn(() => [{
    id: '1',
    name: '团队项目',
    icon: 'folder',
    color: null,
  }]),
  getTeamMembers: vi.fn(() => []),
  restoreTeamProjectContext: vi.fn(),
}))

vi.mock('vue-router', () => ({
  createRouter: () => router,
  createWebHistory: () => ({}),
  useRoute: () => route,
  useRouter: () => router,
}))
vi.mock('@/stores/collaboration', () => ({
  useCollaborationStore: () => collaborationStore,
}))
vi.mock('@/api/task', () => taskApi)
vi.mock('@/api/project', () => ({ fetchProjectList: vi.fn() }))
vi.mock('@/api/milestone', () => ({
  addMilestoneApi: vi.fn(),
  deleteMilestoneApi: vi.fn(),
  fetchMilestoneList: vi.fn(),
  updateMilestoneApi: vi.fn(),
}))
vi.mock('@/api/ai', () => ({
  aiListReplanCancelApi: vi.fn(),
  aiListReplanConfirmApi: vi.fn(),
  aiListReplanPreviewApi: vi.fn(),
  aiTodayOrderRecommendApi: vi.fn(),
}))

const capabilities = (canChangeStatus = true) => ({
  canEditContent: false,
  canChangeStatus,
  canReorganize: false,
  canAssign: false,
  canDelete: false,
})

const task = (status = 0, canChangeStatus = true) => ({
  id: '1',
  projectId: '1',
  milestoneId: null,
  createdByUserId: '1',
  assigneeUserId: '1',
  assignedByUserId: '1',
  assignedAt: '2026-09-01T10:00:00',
  title: '状态幂等任务',
  description: null,
  status,
  priority: 0,
  dueDate: null,
  completedAt: status === 0 ? null : '2026-09-01T12:00:00',
  createTime: null,
  updateTime: null,
  capabilities: capabilities(canChangeStatus),
})

const page = (record = task()) => ({
  data: { records: [record], current: 1, size: 100, total: 1 },
})

const success = (overrides: Record<string, unknown> = {}) => ({
  changed: true,
  finalStatus: 2,
  completedAt: '2026-09-01T12:00:00',
  idempotentReplay: false,
  ...overrides,
})

const mountTaskList = async () => {
  taskApi.fetchTaskList.mockResolvedValue(page())
  collaborationStore.restoreTeamProjectContext.mockResolvedValue({
    kind: 'ready',
    team: collaborationStore.getTeam(),
    project: collaborationStore.getTeamProjects()[0],
  })
  const milestoneApi = await import('@/api/milestone')
  vi.mocked(milestoneApi.fetchMilestoneList).mockResolvedValue({ data: [] } as never)
  const projectApi = await import('@/api/project')
  vi.mocked(projectApi.fetchProjectList).mockResolvedValue({ data: [] } as never)

  const wrapper = mount(TaskList, {
    global: {
      plugins: [createPinia()],
      stubs: {
        AppIcon: true,
        AppConfirmDialog: true,
        Transition: false,
      },
    },
  })
  await vi.waitFor(() => wrapper.get('[data-testid="task-status-toggle-1"]'))
  const title = wrapper.findAll('span').find((candidate) => candidate.text() === '状态幂等任务')
  if (!title) throw new Error('task title not rendered')
  await title.trigger('click')
  await nextTick()
  return wrapper
}

const selectQuality = async (wrapper: Awaited<ReturnType<typeof mountTaskList>>) => {
  await wrapper.get('[data-testid="task-status-toggle-1"]').trigger('click')
  await wrapper.get('[data-testid="task-completion-quality-2"]').trigger('click')
}

describe('TaskList status mutation integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    route.query = { teamId: '10', projectId: '1' }
  })

  it('retries an uncertain write with the exact original clientRequestId and payload', async () => {
    taskApi.changeTaskStatusApi
      .mockRejectedValueOnce(new ApiRequestError('offline'))
      .mockResolvedValueOnce(success({ idempotentReplay: true }))
    const wrapper = await mountTaskList()

    await selectQuality(wrapper)
    await vi.waitFor(() => wrapper.get('[data-testid="task-status-recovery"]'))
    const firstPayload = taskApi.changeTaskStatusApi.mock.calls[0]?.[0]

    taskApi.fetchTaskList.mockResolvedValue(page(task(2)))
    await wrapper.get('[data-testid="task-status-retry-request"]').trigger('click')

    await vi.waitFor(() => expect(taskApi.changeTaskStatusApi).toHaveBeenCalledTimes(2))
    expect(taskApi.changeTaskStatusApi.mock.calls[1]?.[0]).toEqual(firstPayload)
    expect(firstPayload.clientRequestId).toEqual(expect.any(String))
    await vi.waitFor(() => expect(wrapper.find('[data-testid="task-status-recovery"]').exists()).toBe(false))
  })

  it('retries only fact loading after a committed write refresh fails', async () => {
    taskApi.changeTaskStatusApi.mockResolvedValue(success())
    const wrapper = await mountTaskList()
    taskApi.fetchTaskList.mockRejectedValueOnce(new Error('refresh failed'))

    await selectQuality(wrapper)
    await vi.waitFor(() => {
      expect(wrapper.get('[data-testid="task-status-recovery"]').text()).toContain('状态已提交')
    })
    expect(taskApi.changeTaskStatusApi).toHaveBeenCalledTimes(1)

    taskApi.fetchTaskList.mockResolvedValue(page(task(2)))
    await wrapper.get('[data-testid="task-status-refresh-facts"]').trigger('click')

    await vi.waitFor(() => expect(wrapper.find('[data-testid="task-status-recovery"]').exists()).toBe(false))
    expect(taskApi.changeTaskStatusApi).toHaveBeenCalledTimes(1)
  })

  it('refreshes facts without replaying the POST after a CAS conflict', async () => {
    taskApi.changeTaskStatusApi.mockRejectedValue(
      new ApiRequestError('status changed', { code: 50001 }),
    )
    const wrapper = await mountTaskList()
    taskApi.fetchTaskList.mockResolvedValue(page(task(3)))

    await selectQuality(wrapper)

    await vi.waitFor(() => expect(taskApi.fetchTaskList).toHaveBeenCalledTimes(2))
    expect(taskApi.changeTaskStatusApi).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="task-status-recovery"]').exists()).toBe(false)
    })
  })

  it('fails closed and refreshes capabilities on permission denial without login redirect', async () => {
    taskApi.changeTaskStatusApi.mockRejectedValue(
      new ApiRequestError('denied', { code: 40300 }),
    )
    const wrapper = await mountTaskList()
    taskApi.fetchTaskList.mockResolvedValue(page(task(0, false)))

    await selectQuality(wrapper)

    await vi.waitFor(() => expect(wrapper.get('[data-testid="task-status-toggle-1"]').attributes('disabled')).toBeDefined())
    expect(router.push).not.toHaveBeenCalledWith('/login')
    expect(taskApi.changeTaskStatusApi).toHaveBeenCalledTimes(1)
  })

  it('clears milestone drafts when the protected session is reset', async () => {
    const wrapper = await mountTaskList()
    const addMilestoneButton = wrapper
      .findAll('button')
      .find((candidate) => candidate.text().includes('添加阶段'))
    if (!addMilestoneButton) throw new Error('add milestone button not rendered')

    await addMilestoneButton.trigger('click')
    const input = wrapper.get('input[placeholder="输入阶段名称，按回车保存"]')
    await input.setValue('账号 A 私密阶段')

    resetProtectedSessionState('USER_LOGOUT')
    await nextTick()

    expect(wrapper.find('input[placeholder="输入阶段名称，按回车保存"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('账号 A 私密阶段')
    wrapper.unmount()
  })
})
