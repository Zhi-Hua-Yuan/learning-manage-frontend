import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia } from 'pinia'

import TaskList from './TaskList.vue'
import type { TeamMemberContext } from '@/types/team'
import * as taskCache from '@/utils/taskCache'
import { ApiRequestError } from '@/utils/request'
import { establishAuthenticatedSession } from '@/utils/sessionLifecycle'

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

const mountedWrappers: Array<ReturnType<typeof mount>> = []

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
  getTeamProjects: vi.fn(() => [
    {
      id: '1',
      name: '团队项目',
      icon: 'folder',
      color: null,
    },
  ]),
  getTeamMembers: vi.fn((): TeamMemberContext[] => []),
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
  mountedWrappers.push(wrapper)

  await vi.waitFor(() => wrapper.get('[data-testid="task-status-toggle-1"]'))
  const taskTitle = wrapper
    .findAll('span')
    .find((candidate) => candidate.text() === '负责人交接任务')
  if (!taskTitle) throw new Error('task title not rendered')
  await taskTitle.trigger('click')
  await nextTick()
  return wrapper
}

describe('TaskList assignment dialog integration', () => {
  afterEach(() => {
    mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  beforeEach(async () => {
    vi.clearAllMocks()
    establishAuthenticatedSession('task-list-test-token')
    route.query = { teamId: '10', projectId: '1' }
    const members: TeamMemberContext[] = [
      { teamId: '10', userId: '1', username: '所有者', role: 'OWNER', joinedAt: null },
      { teamId: '10', userId: '2', username: '成员二', role: 'MEMBER', joinedAt: null },
      { teamId: '10', userId: '3', username: '成员三', role: 'MEMBER', joinedAt: null },
    ]
    collaborationStore.ensureTeamMembers.mockResolvedValue(members)
    collaborationStore.getTeamMembers.mockReturnValue(members)
    taskApi.assignTaskApi.mockResolvedValue({
      taskId: 1,
      changed: true,
      previousAssigneeUserId: 1,
      assigneeUserId: 2,
      assignedByUserId: 1,
      assignedAt: '2026-09-01T12:00:00',
    })
    const projectApi = await import('@/api/project')
    vi.mocked(projectApi.fetchProjectList).mockResolvedValue({
      data: [{ id: '99', name: '个人项目', icon: 'folder' }],
    } as never)
  })

  it('records an immutable expected assignee and submits the frozen CAS payload', async () => {
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
    const member = dialog
      .findAll('[role="option"]')
      .find((option) => option.text().includes('成员二'))
    if (!member) throw new Error('missing assignment candidate')
    await member.trigger('click')

    expect(vm.taskAssignmentDraft?.expectedAssigneeUserId).toBe('1')
    expect(vm.taskAssignmentDraft?.targetAssigneeUserId).toBe('2')
    taskApi.fetchTaskList.mockResolvedValue({
      data: {
        records: [
          {
            ...task(true),
            assigneeUserId: '2',
            assignedByUserId: '1',
            assignedAt: '2026-09-01T12:00:00',
          },
        ],
        current: 1,
        size: 100,
        total: 1,
      },
    })
    await dialog.get('[data-testid="task-assignment-confirm"]').trigger('click')
    await vi.waitFor(() =>
      expect(taskApi.assignTaskApi).toHaveBeenCalledWith({
        taskId: '1',
        assigneeUserId: '2',
        expectedAssigneeUserId: '1',
      }),
    )
    await vi.waitFor(() =>
      expect(wrapper.find('[data-testid="task-assignment-dialog"]').exists()).toBe(false),
    )
  })

  it('invalidates caches and replaces the opened task with fresh assignee capabilities', async () => {
    const removeCaches = vi.spyOn(taskCache, 'removeProjectTaskCaches')
    const wrapper = await mountTaskList()
    const previousSelectedTask = (
      wrapper.vm as unknown as { selectedTask: ReturnType<typeof task> }
    ).selectedTask
    await wrapper.get('[data-testid="task-assignee-change"]').trigger('click')
    const dialog = await vi.waitFor(() => wrapper.get('[data-testid="task-assignment-dialog"]'))
    await dialog.get('[data-testid="task-assignee-picker-trigger"]').trigger('click')
    const member = await vi.waitFor(() => {
      const candidate = dialog
        .findAll('[role="option"]')
        .find((option) => option.text().includes('成员二'))
      if (!candidate) throw new Error('missing assignment candidate')
      return candidate
    })
    await member.trigger('click')

    taskApi.fetchTaskList.mockResolvedValue({
      data: {
        records: [
          {
            ...task(false),
            assigneeUserId: '2',
            assignedByUserId: '1',
            assignedAt: '2026-09-01T12:00:00',
          },
        ],
        current: 1,
        size: 100,
        total: 1,
      },
    })
    await dialog.get('[data-testid="task-assignment-confirm"]').trigger('click')

    const vm = wrapper.vm as unknown as {
      selectedTask: ReturnType<typeof task>
      taskAssignmentChangedRevision: number
    }
    await vi.waitFor(() => expect(vm.selectedTask.assigneeUserId).toBe('2'))
    expect(vm.selectedTask).not.toBe(previousSelectedTask)
    expect(vm.selectedTask.assignedByUserId).toBe('1')
    expect(vm.selectedTask.assignedAt).toBe('2026-09-01T12:00:00')
    expect(vm.selectedTask.capabilities.canAssign).toBe(false)
    expect(vm.taskAssignmentChangedRevision).toBe(1)
    expect(removeCaches).toHaveBeenCalledWith('1')
    removeCaches.mockRestore()
  })

  it('treats changed false as idempotent and does not emit changed side effects', async () => {
    const removeCaches = vi.spyOn(taskCache, 'removeProjectTaskCaches')
    taskApi.assignTaskApi.mockResolvedValue({
      taskId: 1,
      changed: false,
      previousAssigneeUserId: 2,
      assigneeUserId: 2,
      assignedByUserId: 1,
      assignedAt: '2026-09-01T12:00:00',
    })
    const wrapper = await mountTaskList()
    await wrapper.get('[data-testid="task-assignee-change"]').trigger('click')
    const dialog = await vi.waitFor(() => wrapper.get('[data-testid="task-assignment-dialog"]'))
    await dialog.get('[data-testid="task-assignee-picker-trigger"]').trigger('click')
    const member = await vi.waitFor(() => {
      const candidate = dialog
        .findAll('[role="option"]')
        .find((option) => option.text().includes('成员二'))
      if (!candidate) throw new Error('missing assignment candidate')
      return candidate
    })
    await member.trigger('click')
    taskApi.fetchTaskList.mockResolvedValue({
      data: { records: [{ ...task(true), assigneeUserId: '2' }], current: 1, size: 100, total: 1 },
    })

    await dialog.get('[data-testid="task-assignment-confirm"]').trigger('click')

    const vm = wrapper.vm as unknown as { taskAssignmentChangedRevision: number }
    await vi.waitFor(() =>
      expect(wrapper.find('[data-testid="task-assignment-dialog"]').exists()).toBe(false),
    )
    expect(vm.taskAssignmentChangedRevision).toBe(0)
    expect(removeCaches).not.toHaveBeenCalled()
    removeCaches.mockRestore()
  })

  it('prevents duplicate requests while an assignment submission is pending', async () => {
    let resolveAssignment!: (value: unknown) => void
    taskApi.assignTaskApi.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAssignment = resolve
        }),
    )
    const wrapper = await mountTaskList()
    await wrapper.get('[data-testid="task-assignee-change"]').trigger('click')
    const dialog = await vi.waitFor(() => wrapper.get('[data-testid="task-assignment-dialog"]'))
    await dialog.get('[data-testid="task-assignee-picker-trigger"]').trigger('click')
    const member = await vi.waitFor(() => {
      const candidate = dialog
        .findAll('[role="option"]')
        .find((option) => option.text().includes('成员二'))
      if (!candidate) throw new Error('missing assignment candidate')
      return candidate
    })
    await member.trigger('click')

    const confirm = dialog.get('[data-testid="task-assignment-confirm"]')
    await confirm.trigger('click')
    await confirm.trigger('click')
    expect(taskApi.assignTaskApi).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(confirm.text()).toBe('处理中…'))

    taskApi.fetchTaskList.mockResolvedValue({
      data: { records: [{ ...task(true), assigneeUserId: '2' }], current: 1, size: 100, total: 1 },
    })
    resolveAssignment({
      taskId: 1,
      changed: true,
      previousAssigneeUserId: 1,
      assigneeUserId: 2,
      assignedByUserId: 1,
      assignedAt: '2026-09-01T12:00:00',
    })
    await vi.waitFor(() =>
      expect(wrapper.find('[data-testid="task-assignment-dialog"]').exists()).toBe(false),
    )
  })

  it('rebases a CAS conflict and resubmits only after explicit confirmation', async () => {
    taskApi.assignTaskApi
      .mockRejectedValueOnce(new ApiRequestError('负责人已变化', { code: 50001 }))
      .mockResolvedValueOnce({
        taskId: 1,
        changed: true,
        previousAssigneeUserId: 3,
        assigneeUserId: 2,
        assignedByUserId: 1,
        assignedAt: '2026-09-01T12:30:00',
      })
    const wrapper = await mountTaskList()
    await wrapper.get('[data-testid="task-assignee-change"]').trigger('click')
    const dialog = await vi.waitFor(() => wrapper.get('[data-testid="task-assignment-dialog"]'))
    await dialog.get('[data-testid="task-assignee-picker-trigger"]').trigger('click')
    const member = await vi.waitFor(() => {
      const candidate = dialog
        .findAll('[role="option"]')
        .find((option) => option.text().includes('成员二'))
      if (!candidate) throw new Error('missing assignment candidate')
      return candidate
    })
    await member.trigger('click')
    await dialog.get('[data-testid="task-assignment-reason"]').setValue('  保留原因  ')
    taskApi.fetchTaskList.mockResolvedValue({
      data: { records: [{ ...task(true), assigneeUserId: '3' }], current: 1, size: 100, total: 1 },
    })

    await dialog.get('[data-testid="task-assignment-confirm"]').trigger('click')

    await vi.waitFor(() => wrapper.get('[data-testid="task-assignment-reconfirm"]'))
    const vm = wrapper.vm as unknown as {
      taskAssignmentDraft: {
        initialExpectedAssigneeUserId: string | null
        expectedAssigneeUserId: string | null
        targetAssigneeUserId: string | null
        reason: string
      }
    }
    expect(vm.taskAssignmentDraft).toMatchObject({
      initialExpectedAssigneeUserId: '1',
      expectedAssigneeUserId: '3',
      targetAssigneeUserId: '2',
      reason: '  保留原因  ',
    })
    expect(wrapper.get('[data-testid="task-assignment-latest-assignee"]').text()).toBe('成员三')
    expect(taskApi.assignTaskApi).toHaveBeenCalledTimes(1)
    expect(collaborationStore.ensureTeamMembers).toHaveBeenCalledTimes(2)

    taskApi.fetchTaskList.mockResolvedValue({
      data: { records: [{ ...task(true), assigneeUserId: '2' }], current: 1, size: 100, total: 1 },
    })
    await wrapper.get('[data-testid="task-assignment-reconfirm"]').trigger('click')

    await vi.waitFor(() =>
      expect(wrapper.find('[data-testid="task-assignment-dialog"]').exists()).toBe(false),
    )
    expect(taskApi.assignTaskApi).toHaveBeenCalledTimes(2)
    expect(taskApi.assignTaskApi).toHaveBeenNthCalledWith(2, {
      taskId: '1',
      assigneeUserId: '2',
      expectedAssigneeUserId: '3',
      reason: '保留原因',
    })
  })

  it('does not resubmit when conflict reconciliation finds the target already applied', async () => {
    taskApi.assignTaskApi.mockRejectedValueOnce(
      new ApiRequestError('负责人已变化', { code: 50001 }),
    )
    const wrapper = await mountTaskList()
    await wrapper.get('[data-testid="task-assignee-change"]').trigger('click')
    const dialog = await vi.waitFor(() => wrapper.get('[data-testid="task-assignment-dialog"]'))
    await dialog.get('[data-testid="task-assignee-picker-trigger"]').trigger('click')
    const member = await vi.waitFor(() => {
      const candidate = dialog
        .findAll('[role="option"]')
        .find((option) => option.text().includes('成员二'))
      if (!candidate) throw new Error('missing assignment candidate')
      return candidate
    })
    await member.trigger('click')
    taskApi.fetchTaskList.mockResolvedValue({
      data: { records: [{ ...task(true), assigneeUserId: '2' }], current: 1, size: 100, total: 1 },
    })

    await dialog.get('[data-testid="task-assignment-confirm"]').trigger('click')

    await vi.waitFor(() =>
      expect(wrapper.find('[data-testid="task-assignment-dialog"]').exists()).toBe(false),
    )
    expect(taskApi.assignTaskApi).toHaveBeenCalledTimes(1)
    expect(
      (wrapper.vm as unknown as { taskAssignmentChangedRevision: number })
        .taskAssignmentChangedRevision,
    ).toBe(1)
  })

  it('reconciles an uncertain network result before allowing any retry', async () => {
    taskApi.assignTaskApi.mockRejectedValueOnce(new ApiRequestError('network unavailable'))
    const wrapper = await mountTaskList()
    await wrapper.get('[data-testid="task-assignee-change"]').trigger('click')
    const dialog = await vi.waitFor(() => wrapper.get('[data-testid="task-assignment-dialog"]'))
    await dialog.get('[data-testid="task-assignee-picker-trigger"]').trigger('click')
    const member = await vi.waitFor(() => {
      const candidate = dialog
        .findAll('[role="option"]')
        .find((option) => option.text().includes('成员二'))
      if (!candidate) throw new Error('missing assignment candidate')
      return candidate
    })
    await member.trigger('click')
    taskApi.fetchTaskList.mockResolvedValue({
      data: { records: [{ ...task(true), assigneeUserId: '2' }], current: 1, size: 100, total: 1 },
    })

    await dialog.get('[data-testid="task-assignment-confirm"]').trigger('click')

    await vi.waitFor(() =>
      expect(wrapper.find('[data-testid="task-assignment-dialog"]').exists()).toBe(false),
    )
    expect(taskApi.assignTaskApi).toHaveBeenCalledTimes(1)
  })

  it('retries only fact reconciliation when conflict recovery cannot load the task', async () => {
    taskApi.assignTaskApi.mockRejectedValueOnce(
      new ApiRequestError('负责人已变化', { code: 50001 }),
    )
    const wrapper = await mountTaskList()
    await wrapper.get('[data-testid="task-assignee-change"]').trigger('click')
    const dialog = await vi.waitFor(() => wrapper.get('[data-testid="task-assignment-dialog"]'))
    await dialog.get('[data-testid="task-assignee-picker-trigger"]').trigger('click')
    const member = await vi.waitFor(() => {
      const candidate = dialog
        .findAll('[role="option"]')
        .find((option) => option.text().includes('成员二'))
      if (!candidate) throw new Error('missing assignment candidate')
      return candidate
    })
    await member.trigger('click')
    taskApi.fetchTaskList.mockRejectedValueOnce(new Error('refresh failed'))

    await dialog.get('[data-testid="task-assignment-confirm"]').trigger('click')
    await vi.waitFor(() => wrapper.get('[data-testid="task-assignment-reconcile-retry"]'))
    expect(taskApi.assignTaskApi).toHaveBeenCalledTimes(1)

    taskApi.fetchTaskList.mockResolvedValue({
      data: { records: [{ ...task(true), assigneeUserId: '3' }], current: 1, size: 100, total: 1 },
    })
    await wrapper.get('[data-testid="task-assignment-reconcile-retry"]').trigger('click')

    await vi.waitFor(() => wrapper.get('[data-testid="task-assignment-reconfirm"]'))
    expect(taskApi.assignTaskApi).toHaveBeenCalledTimes(1)
  })

  it('preserves but disables a target that leaves the team during conflict recovery', async () => {
    taskApi.assignTaskApi.mockRejectedValueOnce(
      new ApiRequestError('负责人已变化', { code: 50001 }),
    )
    const wrapper = await mountTaskList()
    await wrapper.get('[data-testid="task-assignee-change"]').trigger('click')
    const dialog = await vi.waitFor(() => wrapper.get('[data-testid="task-assignment-dialog"]'))
    await dialog.get('[data-testid="task-assignee-picker-trigger"]').trigger('click')
    const member = await vi.waitFor(() => {
      const candidate = dialog
        .findAll('[role="option"]')
        .find((option) => option.text().includes('成员二'))
      if (!candidate) throw new Error('missing assignment candidate')
      return candidate
    })
    await member.trigger('click')

    const latestMembers: TeamMemberContext[] = [
      { teamId: '10', userId: '1', username: '所有者', role: 'OWNER', joinedAt: null },
      { teamId: '10', userId: '3', username: '成员三', role: 'MEMBER', joinedAt: null },
    ]
    collaborationStore.ensureTeamMembers.mockResolvedValue(latestMembers)
    collaborationStore.getTeamMembers.mockReturnValue(latestMembers)
    taskApi.fetchTaskList.mockResolvedValue({
      data: { records: [{ ...task(true), assigneeUserId: '3' }], current: 1, size: 100, total: 1 },
    })

    await dialog.get('[data-testid="task-assignment-confirm"]').trigger('click')

    const reconfirm = await vi.waitFor(() =>
      wrapper.get('[data-testid="task-assignment-reconfirm"]'),
    )
    expect(reconfirm.attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="task-assignment-recovery-target"]').text()).toBe('用户 #2')
    expect(
      (
        wrapper.vm as unknown as {
          taskAssignmentDraft: { targetAssigneeUserId: string | null }
        }
      ).taskAssignmentDraft.targetAssigneeUserId,
    ).toBe('2')
    expect(taskApi.assignTaskApi).toHaveBeenCalledTimes(1)
  })

  it('refreshes permissions without logging out after a 40300 assignment denial', async () => {
    taskApi.assignTaskApi.mockRejectedValueOnce(
      new ApiRequestError('无权限', { code: 40300, httpStatus: 403 }),
    )
    const wrapper = await mountTaskList()
    await wrapper.get('[data-testid="task-assignee-change"]').trigger('click')
    const dialog = await vi.waitFor(() => wrapper.get('[data-testid="task-assignment-dialog"]'))
    await dialog.get('[data-testid="task-assignee-picker-trigger"]').trigger('click')
    const member = await vi.waitFor(() => {
      const candidate = dialog
        .findAll('[role="option"]')
        .find((option) => option.text().includes('成员二'))
      if (!candidate) throw new Error('missing assignment candidate')
      return candidate
    })
    await member.trigger('click')
    taskApi.fetchTaskList.mockResolvedValue({
      data: { records: [task(false)], current: 1, size: 100, total: 1 },
    })

    await dialog.get('[data-testid="task-assignment-confirm"]').trigger('click')

    await vi.waitFor(() =>
      expect(wrapper.find('[data-testid="task-assignment-dialog"]').exists()).toBe(false),
    )
    expect(
      (wrapper.vm as unknown as { selectedTask: ReturnType<typeof task> }).selectedTask.capabilities
        .canAssign,
    ).toBe(false)
    expect(router.push).not.toHaveBeenCalledWith('/login')
  })

  it('closes the stale task detail after a 40400 assignment response', async () => {
    taskApi.assignTaskApi.mockRejectedValueOnce(
      new ApiRequestError('任务不存在', { code: 40400, httpStatus: 404 }),
    )
    const wrapper = await mountTaskList()
    await wrapper.get('[data-testid="task-assignee-change"]').trigger('click')
    const dialog = await vi.waitFor(() => wrapper.get('[data-testid="task-assignment-dialog"]'))
    await dialog.get('[data-testid="task-assignee-picker-trigger"]').trigger('click')
    const member = await vi.waitFor(() => {
      const candidate = dialog
        .findAll('[role="option"]')
        .find((option) => option.text().includes('成员二'))
      if (!candidate) throw new Error('missing assignment candidate')
      return candidate
    })
    await member.trigger('click')
    taskApi.fetchTaskList.mockResolvedValue({
      data: { records: [], current: 1, size: 100, total: 0 },
    })

    await dialog.get('[data-testid="task-assignment-confirm"]').trigger('click')

    await vi.waitFor(() =>
      expect(wrapper.find('[data-testid="task-assignment-dialog"]').exists()).toBe(false),
    )
    expect((wrapper.vm as unknown as { selectedTask: unknown }).selectedTask).toBeNull()
    expect(taskApi.assignTaskApi).toHaveBeenCalledTimes(1)
  })

  it('fails closed and retries only the fact refresh after the assignment commits', async () => {
    const wrapper = await mountTaskList()
    await wrapper.get('[data-testid="task-assignee-change"]').trigger('click')
    const dialog = await vi.waitFor(() => wrapper.get('[data-testid="task-assignment-dialog"]'))
    await dialog.get('[data-testid="task-assignee-picker-trigger"]').trigger('click')
    const member = await vi.waitFor(() => {
      const candidate = dialog
        .findAll('[role="option"]')
        .find((option) => option.text().includes('成员二'))
      if (!candidate) throw new Error('missing assignment candidate')
      return candidate
    })
    await member.trigger('click')
    taskApi.fetchTaskList.mockRejectedValue(new Error('refresh unavailable'))

    await dialog.get('[data-testid="task-assignment-confirm"]').trigger('click')

    const vm = wrapper.vm as unknown as {
      selectedTask: ReturnType<typeof task>
      taskAssignmentChangedRevision: number
      taskAssignmentMutationPhase: string
    }
    await vi.waitFor(() => expect(wrapper.get('[data-testid="task-assignment-recover"]')))
    expect(vm.selectedTask.capabilities.canAssign).toBe(false)
    expect(vm.taskAssignmentMutationPhase).toBe('committed-refresh-error')
    expect(taskApi.assignTaskApi).toHaveBeenCalledTimes(1)

    taskApi.fetchTaskList.mockResolvedValue({
      data: {
        records: [
          {
            ...task(false),
            assigneeUserId: '2',
            assignedByUserId: '1',
            assignedAt: '2026-09-01T12:00:00',
          },
        ],
        current: 1,
        size: 100,
        total: 1,
      },
    })
    await wrapper.get('[data-testid="task-assignment-recover"]').trigger('click')

    await vi.waitFor(() =>
      expect(wrapper.find('[data-testid="task-assignment-dialog"]').exists()).toBe(false),
    )
    expect(taskApi.assignTaskApi).toHaveBeenCalledTimes(1)
    expect(vm.selectedTask.assigneeUserId).toBe('2')
    expect(vm.taskAssignmentChangedRevision).toBe(1)
  })

  it('refreshes the opened task on window focus and replaces assignee capabilities', async () => {
    const wrapper = await mountTaskList()
    const vm = wrapper.vm as unknown as {
      selectedTask: ReturnType<typeof task>
    }
    let resolveRefresh!: (value: unknown) => void
    taskApi.fetchTaskList.mockImplementationOnce(
      () => new Promise((resolve) => { resolveRefresh = resolve }),
    )

    window.dispatchEvent(new Event('focus'))
    await vi.waitFor(() => expect(taskApi.fetchTaskList).toHaveBeenCalledTimes(2), {
      timeout: 1500,
    })
    expect(vm.selectedTask.capabilities.canAssign).toBe(false)

    resolveRefresh({
      data: {
        records: [{ ...task(false), assigneeUserId: '2' }],
        current: 1,
        size: 100,
        total: 1,
      },
    })
    await vi.waitFor(() => expect(vm.selectedTask.assigneeUserId).toBe('2'))
    expect(vm.selectedTask.capabilities.canAssign).toBe(false)
  })

  it('does not fail closed when a newer task refresh supersedes the focus request', async () => {
    const wrapper = await mountTaskList()
    const vm = wrapper.vm as unknown as {
      selectedTask: ReturnType<typeof task>
      loadTasks: (options: { forceRefresh: boolean }) => Promise<unknown>
    }
    let resolveFocus!: (value: unknown) => void
    taskApi.fetchTaskList.mockImplementationOnce(
      () => new Promise((resolve) => { resolveFocus = resolve }),
    )

    window.dispatchEvent(new Event('focus'))
    await vi.waitFor(() => expect(taskApi.fetchTaskList).toHaveBeenCalledTimes(2), {
      timeout: 1500,
    })

    taskApi.fetchTaskList.mockResolvedValueOnce({
      data: { records: [{ ...task(true), assigneeUserId: '2' }], current: 1, size: 100, total: 1 },
    })
    await vm.loadTasks({ forceRefresh: true })
    expect(vm.selectedTask.capabilities.canAssign).toBe(true)

    resolveFocus({
      data: { records: [{ ...task(false), assigneeUserId: '3' }], current: 1, size: 100, total: 1 },
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(vm.selectedTask.assigneeUserId).toBe('2')
    expect(vm.selectedTask.capabilities.canAssign).toBe(true)
  })

  it('force-validates team access before a focus task refresh', async () => {
    await mountTaskList()
    collaborationStore.restoreTeamProjectContext.mockClear()
    taskApi.fetchTaskList.mockResolvedValueOnce({
      data: { records: [task(true)], current: 1, size: 100, total: 1 },
    })

    window.dispatchEvent(new Event('focus'))
    await vi.waitFor(() => expect(taskApi.fetchTaskList).toHaveBeenCalledTimes(2), {
      timeout: 1500,
    })
    expect(collaborationStore.restoreTeamProjectContext).toHaveBeenCalledWith(
      '10',
      '1',
      { force: true },
    )
  })

  it('deduplicates focus and visibility refresh triggers and closes removed detail', async () => {
    const wrapper = await mountTaskList()
    const vm = wrapper.vm as unknown as { selectedTask: ReturnType<typeof task> | null }
    taskApi.fetchTaskList.mockClear()
    taskApi.fetchTaskList.mockResolvedValueOnce({
      data: { records: [], current: 1, size: 100, total: 0 },
    })

    window.dispatchEvent(new Event('focus'))
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.waitFor(() => expect(taskApi.fetchTaskList).toHaveBeenCalledTimes(1), {
      timeout: 1500,
    })
    await vi.waitFor(() => expect(vm.selectedTask).toBeNull())
    expect(taskApi.fetchTaskList).toHaveBeenCalledTimes(1)
  })

  it('queues focus refresh while the opened task has unsaved text', async () => {
    const wrapper = await mountTaskList()
    const vm = wrapper.vm as unknown as { selectedTask: ReturnType<typeof task> }
    vm.selectedTask.title = '本地未保存标题'
    taskApi.fetchTaskList.mockClear()

    window.dispatchEvent(new Event('focus'))
    await new Promise((resolve) => setTimeout(resolve, 450))
    expect(taskApi.fetchTaskList).not.toHaveBeenCalled()
  })

  it('keeps refresh-only recovery when the committed task is temporarily missing', async () => {
    const wrapper = await mountTaskList()
    await wrapper.get('[data-testid="task-assignee-change"]').trigger('click')
    const dialog = await vi.waitFor(() => wrapper.get('[data-testid="task-assignment-dialog"]'))
    await dialog.get('[data-testid="task-assignee-picker-trigger"]').trigger('click')
    const member = await vi.waitFor(() => {
      const candidate = dialog
        .findAll('[role="option"]')
        .find((option) => option.text().includes('成员二'))
      if (!candidate) throw new Error('missing assignment candidate')
      return candidate
    })
    await member.trigger('click')
    taskApi.fetchTaskList.mockResolvedValue({
      data: { records: [], current: 1, size: 100, total: 0 },
    })

    await dialog.get('[data-testid="task-assignment-confirm"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.get('[data-testid="task-assignment-recover"]')))
    expect(taskApi.assignTaskApi).toHaveBeenCalledTimes(1)

    await wrapper.get('[data-testid="task-assignment-recover"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.get('[data-testid="task-assignment-recover"]')))
    expect(taskApi.assignTaskApi).toHaveBeenCalledTimes(1)
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

  it('opens assignment history independently from canAssign', async () => {
    taskApi.fetchTaskAssignmentHistoryApi.mockResolvedValue({
      records: [
        {
          id: 10,
          taskId: 1,
          action: 'REASSIGN',
          fromAssignee: { userId: 1, username: '所有者' },
          toAssignee: { userId: 2, username: '成员二' },
          assignedBy: { userId: 1, username: '所有者' },
          reason: '<b>任务调整</b>',
          createTime: '2026-09-01T12:00:00',
        },
      ],
      current: 1,
      size: 50,
      total: 1,
    })

    const wrapper = await mountTaskList(false)
    await wrapper.get('[data-testid="task-assignee-history"]').trigger('click')

    await vi.waitFor(() =>
      expect(taskApi.fetchTaskAssignmentHistoryApi).toHaveBeenCalledWith('1', {
        current: 1,
        size: 50,
      }),
    )
    expect(wrapper.find('[data-testid="task-assignment-history-drawer"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="task-assignment-history-item"]').text()).toContain(
      '转派负责人',
    )
    expect(wrapper.text()).toContain('<b>任务调整</b>')
    expect(wrapper.find('[data-testid="task-assignee-change"]').exists()).toBe(false)
  })

  it('clears the history drawer when changing the selected task', async () => {
    taskApi.fetchTaskAssignmentHistoryApi.mockResolvedValue({
      records: [],
      current: 1,
      size: 50,
      total: 0,
    })
    const wrapper = await mountTaskList(false)
    await wrapper.get('[data-testid="task-assignee-history"]').trigger('click')
    await vi.waitFor(() =>
      expect(wrapper.find('[data-testid="task-assignment-history-empty"]').exists()).toBe(true),
    )

    const vm = wrapper.vm as unknown as {
      selectedTask: ReturnType<typeof task> | null
      selectTask: (value: unknown) => void
    }
    vm.selectTask({ ...task(false), id: '2', title: '第二任务' })
    await vi.waitFor(() =>
      expect(wrapper.find('[data-testid="task-assignment-history-drawer"]').exists()).toBe(false),
    )
    expect(vm.selectedTask?.id).toBe('2')
  })

  it('refreshes the open history drawer after a committed assignment change', async () => {
    taskApi.fetchTaskAssignmentHistoryApi
      .mockResolvedValueOnce({
        records: [],
        current: 1,
        size: 50,
        total: 0,
      })
      .mockResolvedValueOnce({
        records: [
          {
            id: 12,
            taskId: 1,
            action: 'REASSIGN',
            fromAssignee: { userId: 1, username: '所有者' },
            toAssignee: { userId: 2, username: '成员二' },
            assignedBy: { userId: 1, username: '所有者' },
            reason: '已完成交接',
            createTime: '2026-09-01T12:00:00',
          },
        ],
        current: 1,
        size: 50,
        total: 1,
      })
    const wrapper = await mountTaskList()
    await wrapper.get('[data-testid="task-assignee-history"]').trigger('click')
    await vi.waitFor(() =>
      expect(taskApi.fetchTaskAssignmentHistoryApi).toHaveBeenCalledTimes(1),
    )

    await wrapper.get('[data-testid="task-assignee-change"]').trigger('click')
    const dialog = await vi.waitFor(() => wrapper.get('[data-testid="task-assignment-dialog"]'))
    await dialog.get('[data-testid="task-assignee-picker-trigger"]').trigger('click')
    const member = await vi.waitFor(() => {
      const candidate = dialog
        .findAll('[role="option"]')
        .find((option) => option.text().includes('成员二'))
      if (!candidate) throw new Error('missing assignment candidate')
      return candidate
    })
    await member.trigger('click')
    taskApi.fetchTaskList.mockResolvedValue({
      data: {
        records: [
          {
            ...task(false),
            assigneeUserId: '2',
            assignedByUserId: '1',
            assignedAt: '2026-09-01T12:00:00',
          },
        ],
        current: 1,
        size: 100,
        total: 1,
      },
    })
    await dialog.get('[data-testid="task-assignment-confirm"]').trigger('click')

    await vi.waitFor(() =>
      expect(taskApi.fetchTaskAssignmentHistoryApi).toHaveBeenCalledTimes(2),
    )
    expect(taskApi.fetchTaskAssignmentHistoryApi).toHaveBeenLastCalledWith('1', {
      current: 1,
      size: 50,
    })
    expect(wrapper.get('[data-testid="task-assignment-history-item"]').text()).toContain(
      '转派负责人',
    )
  })

  it('does not refresh history for an idempotent assignment result', async () => {
    taskApi.fetchTaskAssignmentHistoryApi.mockResolvedValue({
      records: [],
      current: 1,
      size: 50,
      total: 0,
    })
    taskApi.assignTaskApi.mockResolvedValue({
      taskId: 1,
      changed: false,
      previousAssigneeUserId: 2,
      assigneeUserId: 2,
      assignedByUserId: 1,
      assignedAt: '2026-09-01T12:00:00',
    })
    const wrapper = await mountTaskList()
    await wrapper.get('[data-testid="task-assignee-history"]').trigger('click')
    await vi.waitFor(() =>
      expect(taskApi.fetchTaskAssignmentHistoryApi).toHaveBeenCalledTimes(1),
    )

    await wrapper.get('[data-testid="task-assignee-change"]').trigger('click')
    const dialog = await vi.waitFor(() => wrapper.get('[data-testid="task-assignment-dialog"]'))
    await dialog.get('[data-testid="task-assignee-picker-trigger"]').trigger('click')
    const member = await vi.waitFor(() => {
      const candidate = dialog
        .findAll('[role="option"]')
        .find((option) => option.text().includes('成员二'))
      if (!candidate) throw new Error('missing assignment candidate')
      return candidate
    })
    await member.trigger('click')
    taskApi.fetchTaskList.mockResolvedValue({
      data: { records: [{ ...task(true), assigneeUserId: '2' }], current: 1, size: 100, total: 1 },
    })
    await dialog.get('[data-testid="task-assignment-confirm"]').trigger('click')

    await vi.waitFor(() =>
      expect(wrapper.find('[data-testid="task-assignment-dialog"]').exists()).toBe(false),
    )
    expect(taskApi.fetchTaskAssignmentHistoryApi).toHaveBeenCalledTimes(1)
  })

  it('drains a queued history refresh after the initial history request settles', async () => {
    let resolveInitial!: (value: unknown) => void
    const initialRequest = new Promise((resolve) => {
      resolveInitial = resolve
    })
    taskApi.fetchTaskAssignmentHistoryApi
      .mockReturnValueOnce(initialRequest as never)
      .mockResolvedValueOnce({
        records: [
          {
            id: 13,
            taskId: 1,
            action: 'ASSIGN',
            fromAssignee: null,
            toAssignee: { userId: 2, username: '成员二' },
            assignedBy: { userId: 1, username: '所有者' },
            reason: null,
            createTime: '2026-09-01T12:00:00',
          },
        ],
        current: 1,
        size: 50,
        total: 1,
      })
    const wrapper = await mountTaskList()
    const openHistory = wrapper.get('[data-testid="task-assignee-history"]').trigger('click')
    await vi.waitFor(() =>
      expect(taskApi.fetchTaskAssignmentHistoryApi).toHaveBeenCalledTimes(1),
    )

    const vm = wrapper.vm as unknown as {
      emitTaskAssignmentChanged: (taskId: string) => void
    }
    vm.emitTaskAssignmentChanged('1')
    resolveInitial({ records: [], current: 1, size: 50, total: 0 })
    await openHistory

    await vi.waitFor(() =>
      expect(taskApi.fetchTaskAssignmentHistoryApi).toHaveBeenCalledTimes(2),
    )
    expect(wrapper.get('[data-testid="task-assignment-history-item"]').text()).toContain(
      '分配负责人',
    )
  })
})
