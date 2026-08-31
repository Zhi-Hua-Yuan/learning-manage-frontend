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
  changeTaskStatusApi: vi.fn(),
  deleteTaskApi: vi.fn(),
  fetchTaskList: vi.fn(),
  updateTaskContentApi: vi.fn(),
}))

const collaborationStore = vi.hoisted(() => {
  const state = { teamRole: 'OWNER' }
  return {
    state,
    currentUser: { id: '1', username: '当前用户' },
    teamMembersByTeamId: {},
    ensureTeamMembers: vi.fn(),
    getTeam: vi.fn(() => ({
      id: '10',
      ownerId: '1',
      name: '测试团队',
      description: '',
      role: state.teamRole,
    })),
    getTeamProjects: vi.fn(() => [{
      id: '1',
      name: '团队项目',
      icon: 'folder',
      color: null,
    }]),
    getTeamMembers: vi.fn(() => []),
    restoreTeamProjectContext: vi.fn(),
  }
})

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

const mountTaskList = async (context: 'personal' | 'team' = 'team') => {
  route.query = context === 'team'
    ? { teamId: '10', projectId: '1' }
    : { projectId: '1' }

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
    if (
      context === 'team'
      && !['OWNER', 'ADMIN'].includes(collaborationStore.state.teamRole)
    ) {
      wrapper.get('[data-testid="new-task-create-denied"]')
    } else {
      wrapper.get('input[placeholder^="输入任务标题"]')
    }
  })
  return wrapper
}

describe('TaskList initial assignee quick create', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    collaborationStore.state.teamRole = 'OWNER'
    collaborationStore.ensureTeamMembers.mockResolvedValue([
      { teamId: '10', userId: '1', username: '所有者', role: 'OWNER', joinedAt: null },
      { teamId: '10', userId: '2', username: '成员二', role: 'MEMBER', joinedAt: null },
    ])
    collaborationStore.restoreTeamProjectContext.mockResolvedValue({
      kind: 'ready',
      team: collaborationStore.getTeam(),
      project: collaborationStore.getTeamProjects()[0],
    })
    taskApi.addTaskApi.mockResolvedValue({ data: 99 })
    taskApi.fetchTaskList.mockResolvedValue({
      data: { records: [], current: 1, size: 100, total: 0 },
    })

    const projectApi = await import('@/api/project')
    const milestoneApi = await import('@/api/milestone')
    vi.mocked(projectApi.fetchProjectList).mockResolvedValue({
      data: [{ id: '1', name: '个人项目', icon: 'folder' }],
    } as never)
    vi.mocked(milestoneApi.fetchMilestoneList).mockResolvedValue({ data: [] } as never)
  })

  it('loads current team members on open and submits the selected initial assignee', async () => {
    const wrapper = await mountTaskList('team')
    await wrapper.get('[data-testid="task-assignee-picker-trigger"]').trigger('click')

    await vi.waitFor(() => {
      expect(collaborationStore.ensureTeamMembers).toHaveBeenCalledWith('10', { force: true })
      expect(wrapper.get('[data-testid="task-assignee-picker-menu"]').text()).toContain('成员二')
    })

    const memberOption = wrapper.findAll('[role="option"]')
      .find((option) => option.text().includes('成员二'))
    if (!memberOption) throw new Error('missing member option')
    await memberOption.trigger('click')

    const input = wrapper.get('input[placeholder^="输入任务标题"]')
    await input.setValue('指定负责人任务')
    await input.trigger('keydown', { key: 'Enter' })

    await vi.waitFor(() => {
      expect(taskApi.addTaskApi).toHaveBeenCalledWith(expect.objectContaining({
        title: '指定负责人任务',
        projectId: '1',
        assigneeUserId: '2',
      }))
    })
  })

  it('submits an explicit null assignee for an unassigned team task', async () => {
    const wrapper = await mountTaskList('team')
    const input = wrapper.get('input[placeholder^="输入任务标题"]')
    await input.setValue('未分配团队任务')
    await input.trigger('keydown', { key: 'Enter' })

    await vi.waitFor(() => {
      expect(taskApi.addTaskApi).toHaveBeenCalledWith(expect.objectContaining({
        assigneeUserId: null,
      }))
    })
  })

  it('omits assigneeUserId for personal task creation', async () => {
    const wrapper = await mountTaskList('personal')
    expect(wrapper.get('[data-testid="new-task-personal-assignee"]').text()).toContain('当前用户')

    const input = wrapper.get('input[placeholder^="输入任务标题"]')
    await input.setValue('个人任务')
    await input.trigger('keydown', { key: 'Enter' })

    await vi.waitFor(() => expect(taskApi.addTaskApi).toHaveBeenCalledTimes(1))
    expect(taskApi.addTaskApi.mock.calls[0]?.[0]).not.toHaveProperty('assigneeUserId')
  })

  it('fails closed for team members in both the UI and the event handler', async () => {
    collaborationStore.state.teamRole = 'MEMBER'
    const wrapper = await mountTaskList('team')
    expect(wrapper.get('[data-testid="new-task-create-denied"]').text()).toContain('不能创建任务')
    expect(wrapper.find('input[placeholder^="输入任务标题"]').exists()).toBe(false)

    const vm = wrapper.vm as unknown as {
      newTaskTitle: string
      addTask: () => Promise<void>
    }
    vm.newTaskTitle = '绕过界面创建'
    await vm.addTask()
    expect(taskApi.addTaskApi).not.toHaveBeenCalled()
  })

  it('allows team admins to create a task with the default unassigned value', async () => {
    collaborationStore.state.teamRole = 'ADMIN'
    const wrapper = await mountTaskList('team')
    const input = wrapper.get('input[placeholder^="输入任务标题"]')
    await input.setValue('管理员创建任务')
    await input.trigger('keydown', { key: 'Enter' })

    await vi.waitFor(() => expect(taskApi.addTaskApi).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: '1',
        assigneeUserId: null,
      }),
    ))
  })

  it('fails closed for unknown team roles', async () => {
    collaborationStore.state.teamRole = 'UNKNOWN'
    const wrapper = await mountTaskList('team')
    expect(wrapper.get('[data-testid="new-task-create-denied"]').text()).toContain('尚未确认')

    const vm = wrapper.vm as unknown as {
      newTaskTitle: string
      addTask: () => Promise<void>
    }
    vm.newTaskTitle = '未知角色绕过创建'
    await vm.addTask()
    expect(taskApi.addTaskApi).not.toHaveBeenCalled()
  })

  it('preserves the complete draft after a create failure and re-enables controls', async () => {
    const wrapper = await mountTaskList('team')
    await wrapper.get('[data-testid="task-assignee-picker-trigger"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.get('[data-testid="task-assignee-picker-menu"]').text()).toContain('成员二'))
    await wrapper.findAll('[role="option"]').find((option) => option.text().includes('成员二'))?.trigger('click')
    const vm = wrapper.vm as unknown as {
      newTaskTitle: string
      newTaskMilestoneId: string
      newTaskAssigneeUserId: string | null
      addTask: () => Promise<void>
    }
    vm.newTaskTitle = '失败后保留草稿'
    vm.newTaskMilestoneId = '8'
    vm.newTaskAssigneeUserId = '2'
    taskApi.addTaskApi.mockRejectedValueOnce(new Error('network'))

    await vm.addTask()

    expect(vm.newTaskTitle).toBe('失败后保留草稿')
    expect(vm.newTaskMilestoneId).toBe('8')
    expect(vm.newTaskAssigneeUserId).toBe('2')
    expect(wrapper.get('input[placeholder^="输入任务标题"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[data-testid="task-assignee-picker-trigger"]').attributes('disabled')).toBeUndefined()
  })

  it('clears the assignee draft after a successful create', async () => {
    const wrapper = await mountTaskList('team')
    await wrapper.get('[data-testid="task-assignee-picker-trigger"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.get('[data-testid="task-assignee-picker-menu"]').text()).toContain('成员二'))
    await wrapper.findAll('[role="option"]').find((option) => option.text().includes('成员二'))?.trigger('click')
    const vm = wrapper.vm as unknown as {
      newTaskTitle: string
      newTaskMilestoneId: string
      newTaskAssigneeUserId: string | null
      addTask: () => Promise<void>
    }
    vm.newTaskTitle = '成功后清理草稿'
    vm.newTaskMilestoneId = '8'
    vm.newTaskAssigneeUserId = '2'

    await vm.addTask()

    expect(vm.newTaskTitle).toBe('')
    expect(vm.newTaskMilestoneId).toBe('')
    expect(vm.newTaskAssigneeUserId).toBeNull()
  })

  it('does not submit while the assignee picker is open', async () => {
    const wrapper = await mountTaskList('team')
    const input = wrapper.get('input[placeholder^="输入任务标题"]')
    await input.setValue('选择负责人时不创建')
    await wrapper.get('[data-testid="task-assignee-picker-trigger"]').trigger('click')
    await vi.waitFor(() => wrapper.get('[data-testid="task-assignee-picker-menu"]'))

    await wrapper.get('[data-testid="task-assignee-picker-menu"]').trigger('keydown', { key: 'Enter' })

    expect(taskApi.addTaskApi).not.toHaveBeenCalled()
  })

  it('rejects stale non-member ids and freezes duplicate submissions', async () => {
    const wrapper = await mountTaskList('team')
    const vm = wrapper.vm as unknown as {
      newTaskTitle: string
      newTaskAssigneeUserId: string | null
      addTask: () => Promise<void>
    }

    vm.newTaskTitle = '过期负责人'
    vm.newTaskAssigneeUserId = '999'
    await vm.addTask()
    expect(taskApi.addTaskApi).not.toHaveBeenCalled()

    let resolveCreate: (() => void) | undefined
    taskApi.addTaskApi.mockImplementation(() => new Promise((resolve) => {
      resolveCreate = () => resolve({ data: 99 })
    }))
    vm.newTaskAssigneeUserId = null
    const firstSubmission = vm.addTask()
    const duplicateSubmission = vm.addTask()
    await nextTick()
    expect(taskApi.addTaskApi).toHaveBeenCalledTimes(1)

    resolveCreate?.()
    await Promise.all([firstSubmission, duplicateSubmission])
  })
})
