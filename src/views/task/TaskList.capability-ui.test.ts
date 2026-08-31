import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia } from 'pinia'

import TaskList from './TaskList.vue'

const { route, router } = vi.hoisted(() => ({
  route: {
    query: { projectId: '1' },
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
  changeTaskStatusApi: vi.fn(),
  deleteTaskApi: vi.fn(),
  fetchTaskList: vi.fn(),
  updateTaskContentApi: vi.fn(),
}))

vi.mock('vue-router', () => ({
  createRouter: () => router,
  createWebHistory: () => ({}),
  useRoute: () => route,
  useRouter: () => router,
}))

vi.mock('@/api/task', () => taskApi)
vi.mock('@/api/project', () => ({
  fetchProjectList: vi.fn(),
}))
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

const task = (capabilities: Record<string, boolean>) => ({
  id: '1',
  projectId: '1',
  milestoneId: null,
  createdByUserId: '1',
  assigneeUserId: null,
  assignedByUserId: null,
  assignedAt: null,
  title: '权限任务',
  description: '任务描述',
  status: 0,
  priority: 0,
  dueDate: null,
  completedAt: null,
  createTime: null,
  updateTime: null,
  capabilities,
})

const allDenied = {
  canEditContent: false,
  canChangeStatus: false,
  canReorganize: false,
  canAssign: false,
  canDelete: false,
}

const mountTaskList = async (capabilities = allDenied) => {
  const projectApi = await import('@/api/project')
  const milestoneApi = await import('@/api/milestone')
  vi.mocked(projectApi.fetchProjectList).mockResolvedValue({ data: [{ id: '1', name: '项目', icon: 'folder' }] } as never)
  vi.mocked(milestoneApi.fetchMilestoneList).mockResolvedValue({ data: [] } as never)
  taskApi.fetchTaskList.mockResolvedValue({
    data: {
      records: [task(capabilities)],
      current: 1,
      size: 100,
      total: 1,
    },
  })

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

  await vi.waitFor(() => {
    wrapper.get('[data-testid="task-status-toggle-1"]')
  })
  const taskTitle = wrapper.findAll('span').find((candidate) => candidate.text() === '权限任务')
  if (!taskTitle) throw new Error('task title not rendered')
  await taskTitle.trigger('click')
  await nextTick()
  return wrapper
}

describe('TaskList capability-driven controls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    route.query = { projectId: '1' }
  })

  it('fails closed and exposes an understandable read-only state', async () => {
    const wrapper = await mountTaskList()

    expect(wrapper.get('[data-testid="task-status-toggle-1"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-testid="task-status-toggle-1"]').trigger('click')
    expect(taskApi.changeTaskStatusApi).not.toHaveBeenCalled()

    await wrapper.get('[data-testid="task-title-input"]').trigger('input')
    expect(wrapper.get('[data-testid="task-title-input"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="task-description-input"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="task-due-date-trigger"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="task-priority-trigger"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="task-milestone-trigger"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="task-delete-button"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('只读')
  })

  it('enables only content controls when canEditContent is true', async () => {
    const wrapper = await mountTaskList({ ...allDenied, canEditContent: true })

    expect(wrapper.get('[data-testid="task-title-input"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[data-testid="task-description-input"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[data-testid="task-due-date-trigger"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[data-testid="task-status-toggle-1"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="task-priority-trigger"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="task-milestone-trigger"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="task-delete-button"]').attributes('disabled')).toBeDefined()
  })

  it('uses a semantic status button when canChangeStatus is true', async () => {
    const wrapper = await mountTaskList({ ...allDenied, canChangeStatus: true })
    const statusButton = wrapper.get('[data-testid="task-status-toggle-1"]')

    expect(statusButton.element.tagName).toBe('BUTTON')
    expect(statusButton.attributes('disabled')).toBeUndefined()
    expect(statusButton.attributes('aria-pressed')).toBe('false')
    expect(statusButton.attributes('aria-label')).toContain('切换任务')
  })

  it('enables only reorganization controls when canReorganize is true', async () => {
    const wrapper = await mountTaskList({ ...allDenied, canReorganize: true })

    expect(wrapper.get('[data-testid="task-priority-trigger"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[data-testid="task-milestone-trigger"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[data-testid="task-title-input"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="task-due-date-trigger"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="task-delete-button"]').attributes('disabled')).toBeDefined()
  })

  it('enables only deletion when canDelete is true', async () => {
    const wrapper = await mountTaskList({ ...allDenied, canDelete: true })

    expect(wrapper.get('[data-testid="task-delete-button"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[data-testid="task-title-input"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="task-status-toggle-1"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="task-priority-trigger"]').attributes('disabled')).toBeDefined()
  })
})
