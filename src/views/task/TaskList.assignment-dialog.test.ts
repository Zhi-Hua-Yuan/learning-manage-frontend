import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia } from 'pinia'

import TaskList from './TaskList.vue'

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

const capabilities = (canAssign: boolean) => ({
  canEditContent: false,
  canChangeStatus: false,
  canReorganize: false,
  canAssign,
  canDelete: false,
})

const task = (canAssign = true) => ({
  id: '1',
  projectId: '1',
  milestoneId: null,
  createdByUserId: '1',
  assigneeUserId: '1',
  assignedByUserId: '1',
  assignedAt: '2026-09-01T10:00:00',
  title: '负责人交接任务',
  description: null,
  status: 0,
  priority: 0,
  dueDate: null,
  completedAt: null,
  createTime: null,
  updateTime: null,
  capabilities: capabilities(canAssign),
})

const mountTaskList = async (canAssign = true) => {
  taskApi.fetchTaskList.mockResolvedValue({
    data: { records: [task(canAssign)], current: 1, size: 100, total: 1 },
  })
  collaborationStore.restoreTeamProjectContext.mockResolvedValue({
    kind: 'ready',
    team: collaborationStore.getTeam(),
    project: collaborationStore.getTeamProjects()[0],
  })

  const milestoneApi = await import('@/api/milestone')
  vi.mocked(milestoneApi.fetchMilestoneList).mockResolvedValue({ data: [] } as never)

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
  const taskTitle = wrapper.findAll('span').find((candidate) => candidate.text() === '负责人交接任务')
  if (!taskTitle) throw new Error('task title not rendered')
  await taskTitle.trigger('click')
  await nextTick()
  return wrapper
}

describe('TaskList assignment dialog integration', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    route.query = { teamId: '10', projectId: '1' }
    collaborationStore.ensureTeamMembers.mockResolvedValue([
      { teamId: '10', userId: '1', username: '所有者', role: 'OWNER', joinedAt: null },
      { teamId: '10', userId: '2', username: '成员二', role: 'MEMBER', joinedAt: null },
    ])
    const projectApi = await import('@/api/project')
    vi.mocked(projectApi.fetchProjectList).mockResolvedValue({
      data: [{ id: '99', name: '个人项目', icon: 'folder' }],
    } as never)
  })

  it('records an immutable expected assignee and loads fresh team candidates', async () => {
    const wrapper = await mountTaskList()
    await wrapper.get('[data-testid="task-assignee-change"]').trigger('click')

    await vi.waitFor(() => {
      expect(collaborationStore.ensureTeamMembers).toHaveBeenCalledWith('10', { force: true })
      wrapper.get('[data-testid="task-assignment-dialog"]')
    })

    const vm = wrapper.vm as unknown as {
      taskAssignmentDraft: {
        expectedAssigneeUserId: string | null
        targetAssigneeUserId: string | null
      } | null
    }
    expect(vm.taskAssignmentDraft?.expectedAssigneeUserId).toBe('1')

    const dialog = wrapper.get('[data-testid="task-assignment-dialog"]')
    await dialog.get('[data-testid="task-assignee-picker-trigger"]').trigger('click')
    await vi.waitFor(() => expect(dialog.text()).toContain('成员二'))
    const member = dialog.findAll('[role="option"]').find((option) => option.text().includes('成员二'))
    if (!member) throw new Error('missing assignment candidate')
    await member.trigger('click')

    expect(vm.taskAssignmentDraft?.expectedAssigneeUserId).toBe('1')
    expect(vm.taskAssignmentDraft?.targetAssigneeUserId).toBe('2')
    await dialog.get('[data-testid="task-assignment-confirm"]').trigger('click')
    expect(taskApi.assignTaskApi).not.toHaveBeenCalled()
  })

  it('fails closed in both the entry and handler without canAssign', async () => {
    const wrapper = await mountTaskList(false)
    expect(wrapper.find('[data-testid="task-assignee-change"]').exists()).toBe(false)

    const vm = wrapper.vm as unknown as {
      openTaskAssignmentDialog: () => void
      taskAssignmentDraft: unknown
    }
    vm.openTaskAssignmentDialog()
    await nextTick()
    expect(vm.taskAssignmentDraft).toBeNull()
    expect(wrapper.find('[data-testid="task-assignment-dialog"]').exists()).toBe(false)
  })

  it('clears the complete draft after a capability downgrade', async () => {
    const wrapper = await mountTaskList()
    await wrapper.get('[data-testid="task-assignee-change"]').trigger('click')
    await vi.waitFor(() => wrapper.get('[data-testid="task-assignment-dialog"]'))

    const vm = wrapper.vm as unknown as {
      selectedTask: ReturnType<typeof task>
      taskAssignmentDraft: unknown
    }
    vm.selectedTask.capabilities.canAssign = false
    await nextTick()

    expect(vm.taskAssignmentDraft).toBeNull()
    await vi.waitFor(() => {
      expect(wrapper.find('[data-testid="task-assignment-dialog"]').exists()).toBe(false)
    })
  })
})
