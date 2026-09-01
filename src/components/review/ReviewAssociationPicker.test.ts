import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ReviewAssociationPicker from './ReviewAssociationPicker.vue'
import type {
  AssociationLoadState,
  ReviewTaskBucket,
} from '@/composables/useWeeklyReviewAssociations'
import type { ProjectContext } from '@/types/project'
import type { TaskModel } from '@/types/task'

const readyState = (): AssociationLoadState => ({
  status: 'ready',
  errorKind: null,
  errorMessage: null,
})

const projects: ProjectContext[] = [
  {
    id: '10',
    ownerUserId: '1',
    teamId: null,
    name: '个人项目',
    goal: '',
    scope: 'PERSONAL',
    status: 0,
    orderNo: 1,
    icon: null,
    color: null,
    startDate: null,
    endDate: null,
    createTime: null,
    updateTime: null,
  },
  {
    id: '20',
    ownerUserId: '1',
    teamId: '7',
    name: '团队项目',
    goal: '',
    scope: 'TEAM',
    status: 0,
    orderNo: 2,
    icon: null,
    color: null,
    startDate: null,
    endDate: null,
    createTime: null,
    updateTime: null,
  },
]

const task = (id: string, projectId = '10'): TaskModel => ({
  id,
  projectId,
  milestoneId: null,
  createdByUserId: '1',
  assigneeUserId: '1',
  assignedByUserId: '1',
  assignedAt: null,
  title: `任务 ${id}`,
  description: null,
  status: 0,
  priority: 1,
  dueDate: null,
  completedAt: null,
  createTime: null,
  updateTime: null,
  capabilities: {
    canEditContent: true,
    canChangeStatus: true,
    canReorganize: true,
    canAssign: false,
    canDelete: true,
  },
})

const taskBucket = (records: TaskModel[]): ReviewTaskBucket => ({
  projectId: '10',
  records,
  current: 1,
  size: 100,
  total: records.length,
  hasMore: false,
  loadState: readyState(),
})

const mountPicker = (props: Record<string, unknown> = {}, attachTo?: Element) => mount(ReviewAssociationPicker, {
  attachTo,
  props: {
    visibilityScope: 'PRIVATE',
    teamId: null,
    focusProjectId: null,
    taskIds: [],
    projects,
    projectLoadState: readyState(),
    activeTaskProjectId: '10',
    taskBucketsByProjectId: { '10': taskBucket([task('101'), task('102')]) },
    ...props,
  },
})

describe('ReviewAssociationPicker', () => {
  it('emits controlled focus-project and lazy task-project intents', async () => {
    const wrapper = mountPicker()

    await wrapper.get('[data-testid="review-focus-project-select"]').setValue('20')
    await wrapper.get('[data-testid="review-task-project-select"]').setValue('20')

    expect(wrapper.emitted('update:focusProjectId')?.[0]).toEqual(['20'])
    expect(wrapper.emitted('openTaskProject')?.[0]).toEqual(['20'])
  })

  it('emits task selection and removal without owning a second selected state', async () => {
    const wrapper = mountPicker({ taskIds: ['101'] })
    const unchecked = wrapper.get('input[data-task-id="102"]')
    const checked = wrapper.get('input[data-task-id="101"]')

    await unchecked.setValue(true)
    await checked.setValue(false)
    await wrapper.get('button[data-remove-task-id="101"]').trigger('click')

    expect(wrapper.emitted('selectTask')?.[0]).toEqual(['102'])
    expect(wrapper.emitted('unselectTask')).toEqual([['101'], ['101']])
    expect(wrapper.props('taskIds')).toEqual(['101'])
  })

  it('blocks an unchecked 501st task while keeping selected tasks removable', async () => {
    const selected = Array.from({ length: 500 }, (_, index) => String(index + 1))
    const wrapper = mountPicker({
      taskIds: selected,
      taskBucketsByProjectId: { '10': taskBucket([task('1'), task('501')]) },
    })

    expect(wrapper.get('[data-testid="review-task-count"]').text()).toContain('500 / 500')
    expect(wrapper.get('input[data-task-id="501"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('input[data-task-id="1"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[data-testid="review-task-limit"]').text()).toContain('最多关联 500 个任务')

    await wrapper.get('button[data-remove-task-id="1"]').trigger('click')
    expect(wrapper.emitted('unselectTask')?.[0]).toEqual(['1'])
  })

  it('keeps authoritative but not-yet-loaded associations visible', () => {
    const wrapper = mountPicker({
      focusProjectId: '99',
      taskIds: ['999'],
      taskBucketsByProjectId: {},
      activeTaskProjectId: null,
    })

    expect((wrapper.get('[data-testid="review-focus-project-select"]').element as HTMLSelectElement).value).toBe('99')
    expect(wrapper.get('[data-testid="review-selected-tasks"]').text()).toContain('任务 #999（详情尚未加载）')
  })

  it('fails TEAM association selection closed until a target team exists', () => {
    const wrapper = mountPicker({ visibilityScope: 'TEAM', teamId: null })
    expect(wrapper.get('[data-testid="review-association-team-required"]').text()).toContain('先选择共享团队')
    expect(wrapper.find('[data-testid="review-focus-project-select"]').exists()).toBe(false)
  })

  it('supports project and task pagination retry intents', async () => {
    const wrapper = mountPicker({
      projectHasMore: true,
      projectLoadState: {
        status: 'error',
        errorKind: 'UNKNOWN',
        errorMessage: '项目加载失败',
      },
      taskBucketsByProjectId: {
        '10': {
          ...taskBucket([]),
          loadState: {
            status: 'error',
            errorKind: 'UNKNOWN',
            errorMessage: '任务加载失败',
          },
        },
      },
    })

    await wrapper.get('[data-testid="review-project-retry"]').trigger('click')
    await wrapper.get('[data-testid="review-project-load-more"]').trigger('click')
    await wrapper.get('[data-testid="review-task-retry"]').trigger('click')

    expect(wrapper.emitted('retryProjects')).toHaveLength(1)
    expect(wrapper.emitted('loadMoreProjects')).toHaveLength(1)
    expect(wrapper.emitted('retryProjectTasks')?.[0]).toEqual(['10'])
  })

  it('associates validation errors and exposes keyboard focus routing', async () => {
    const wrapper = mountPicker({
      issues: [
        { field: 'focusProjectId', code: 'INVALID_FOCUS_PROJECT_ID' },
        { field: 'taskIds', code: 'INVALID_TASK_ID' },
      ],
    }, document.body)

    const focusSelect = wrapper.get('[data-testid="review-focus-project-select"]')
    expect(focusSelect.attributes('aria-invalid')).toBe('true')
    expect(focusSelect.attributes('aria-describedby')).toContain(
      wrapper.get('[data-testid="review-focus-project-error"]').attributes('id'),
    )
    expect(wrapper.get('[data-testid="review-task-list"]').attributes('aria-describedby')).toContain(
      wrapper.get('[data-testid="review-task-limit"]').attributes('id'),
    )

    expect((wrapper.vm as unknown as { focusIssue: (field: string) => boolean }).focusIssue('focusProjectId')).toBe(true)
    await wrapper.vm.$nextTick()
    expect(document.activeElement).toBe(focusSelect.element)
    wrapper.unmount()
  })
})
