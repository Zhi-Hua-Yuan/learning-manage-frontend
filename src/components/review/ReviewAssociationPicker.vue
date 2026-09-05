<template>
  <section
    class="space-y-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-surface-muted)] p-4 sm:p-5"
    data-testid="review-association-picker"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="text-base font-bold text-[var(--color-text-primary)]">关联资源</h3>
        <p class="mt-1 text-sm text-[var(--color-text-secondary)]">
          重点项目和关联任务只用于你的完整复盘，不会出现在团队共享摘要中。
        </p>
      </div>
      <span
        class="rounded-full bg-[var(--color-bg-surface)] px-3 py-1 text-xs font-bold text-[var(--color-text-secondary)]"
        data-testid="review-task-count"
        aria-live="polite"
      >
        已选 {{ taskIds.length }} / {{ MAX_WEEKLY_REVIEW_TASKS }}
      </span>
    </div>

    <div
      v-if="visibilityScope === 'UNKNOWN'"
      class="rounded-xl border border-[var(--color-danger)] bg-[var(--color-bg-surface)] p-3 text-sm text-[var(--color-danger)]"
      role="alert"
      data-testid="review-association-unknown"
    >
      当前复盘可见性异常，关联资源已停止加载。
    </div>

    <div
      v-else-if="accessMessage"
      class="rounded-xl border border-[var(--color-warning)] bg-[var(--color-bg-surface)] p-3 text-sm text-[var(--color-warning)]"
      role="alert"
      data-testid="review-association-access-message"
    >
      {{ accessMessage }}
    </div>

    <div
      v-if="visibilityScope !== 'UNKNOWN' && visibilityScope === 'TEAM' && !teamId"
      class="rounded-xl border border-[var(--color-warning)] bg-[var(--color-bg-surface)] p-3 text-sm text-[var(--color-warning)]"
      role="status"
      data-testid="review-association-team-required"
    >
      请先选择共享团队，再选择该团队的项目和任务。
    </div>

    <template v-if="visibilityScope !== 'UNKNOWN' && (visibilityScope !== 'TEAM' || Boolean(teamId))">
      <div>
        <label
          :for="focusProjectSelectId"
          class="mb-2 block text-sm font-bold text-[var(--color-text-body)]"
        >
          重点项目
        </label>
        <select
          :id="focusProjectSelectId"
          ref="focusProjectSelectRef"
          :value="focusProjectId ?? ''"
          class="focus-ring w-full rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-body)]"
          :disabled="disabled || projectLoadState.status === 'loading'"
          :aria-invalid="focusProjectIssue ? 'true' : 'false'"
          :aria-describedby="focusProjectDescribedBy"
          data-testid="review-focus-project-select"
          @change="handleFocusProjectChange"
        >
          <option value="">不设置重点项目</option>
          <option
            v-if="unresolvedFocusProjectId"
            :value="unresolvedFocusProjectId"
          >
            已关联项目 #{{ unresolvedFocusProjectId }}（详情尚未加载）
          </option>
          <option v-for="project in projects" :key="project.id" :value="project.id">
            {{ project.name || `项目 #${project.id}` }}
          </option>
        </select>
        <p
          v-if="focusProjectIssue"
          :id="focusProjectErrorId"
          class="mt-2 text-sm text-[var(--color-danger)]"
          role="alert"
          data-testid="review-focus-project-error"
        >
          {{ focusProjectIssue }}
        </p>
      </div>

      <div
        v-if="projectLoadState.status === 'loading' && projects.length === 0"
        class="text-sm text-[var(--color-text-secondary)]"
        role="status"
        aria-live="polite"
        data-testid="review-project-loading"
      >
        正在加载可关联项目…
      </div>
      <div
        v-else-if="projectLoadState.status === 'error'"
        class="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-danger)] bg-[var(--color-bg-surface)] p-3"
        data-testid="review-project-error"
      >
        <p class="text-sm text-[var(--color-danger)]" role="alert">
          {{ projectLoadState.errorMessage || '项目加载失败，请稍后重试。' }}
        </p>
        <button
          type="button"
          class="btn-secondary rounded-lg px-3 py-1.5 text-xs font-bold"
          :disabled="disabled"
          data-testid="review-project-retry"
          @click="$emit('retryProjects')"
        >
          重试
        </button>
      </div>

      <button
        v-if="projectHasMore"
        type="button"
        class="btn-secondary rounded-lg px-3 py-2 text-xs font-bold"
        :disabled="disabled || projectLoadState.status === 'loading'"
        data-testid="review-project-load-more"
        @click="$emit('loadMoreProjects')"
      >
        {{ projectLoadState.status === 'loading' ? '加载中…' : '加载更多项目' }}
      </button>

      <div ref="taskSectionRef" class="space-y-3" tabindex="-1">
        <div>
          <label
            :for="taskProjectSelectId"
            class="mb-2 block text-sm font-bold text-[var(--color-text-body)]"
          >
            浏览项目任务
          </label>
          <select
            :id="taskProjectSelectId"
            :value="activeTaskProjectId ?? ''"
            class="focus-ring w-full rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-body)]"
            :disabled="disabled || projects.length === 0"
            data-testid="review-task-project-select"
            @change="handleTaskProjectChange"
          >
            <option value="">选择项目后加载任务</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">
              {{ project.name || `项目 #${project.id}` }}
            </option>
          </select>
        </div>

        <div
          v-if="activeTaskBucket?.loadState.status === 'loading' && activeTasks.length === 0"
          class="text-sm text-[var(--color-text-secondary)]"
          role="status"
          aria-live="polite"
          data-testid="review-task-loading"
        >
          正在加载项目任务…
        </div>

        <div
          v-else-if="activeTaskBucket?.loadState.status === 'error'"
          class="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-danger)] bg-[var(--color-bg-surface)] p-3"
          data-testid="review-task-error"
        >
          <p class="text-sm text-[var(--color-danger)]" role="alert">
            {{ activeTaskBucket.loadState.errorMessage || '任务加载失败，请稍后重试。' }}
          </p>
          <button
            type="button"
            class="btn-secondary rounded-lg px-3 py-1.5 text-xs font-bold"
            :disabled="disabled"
            data-testid="review-task-retry"
            @click="activeTaskProjectId && $emit('retryProjectTasks', activeTaskProjectId)"
          >
            重试
          </button>
        </div>

        <div
          v-else-if="activeTaskProjectId && activeTaskBucket?.loadState.status === 'ready' && activeTasks.length === 0"
          class="rounded-xl bg-[var(--color-bg-surface)] p-3 text-sm text-[var(--color-text-secondary)]"
          data-testid="review-task-empty"
        >
          当前项目暂无可关联任务。
        </div>

        <div
          v-if="activeTasks.length > 0"
          ref="taskListRef"
          tabindex="-1"
          class="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-2"
          :aria-describedby="taskIdsDescribedBy"
          data-testid="review-task-list"
        >
          <label
            v-for="task in activeTasks"
            :key="task.id"
            class="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 hover:bg-[var(--color-bg-surface-muted)]"
            :class="isTaskSelectionDisabled(task.id) ? 'cursor-not-allowed opacity-60' : ''"
          >
            <input
              type="checkbox"
              class="focus-ring mt-0.5 h-4 w-4"
              :checked="selectedTaskIdSet.has(task.id)"
              :disabled="disabled || isTaskSelectionDisabled(task.id)"
              :aria-label="`${selectedTaskIdSet.has(task.id) ? '取消关联' : '关联'}任务：${task.title || `任务 #${task.id}`}`"
              :data-task-id="task.id"
              @change="handleTaskToggle(task.id, $event)"
            />
            <span class="min-w-0">
              <span class="block truncate text-sm font-medium text-[var(--color-text-body)]">
                {{ task.title || `任务 #${task.id}` }}
              </span>
              <span class="mt-0.5 block text-xs text-[var(--color-text-tertiary)]">
                任务 #{{ task.id }} · {{ getTaskStatusLabel(task.status) }}
              </span>
            </span>
          </label>
        </div>

        <button
          v-if="activeTaskBucket?.hasMore"
          type="button"
          class="btn-secondary rounded-lg px-3 py-2 text-xs font-bold"
          :disabled="disabled || activeTaskBucket.loadState.status === 'loading'"
          data-testid="review-task-load-more"
          @click="activeTaskProjectId && $emit('loadMoreProjectTasks', activeTaskProjectId)"
        >
          {{ activeTaskBucket.loadState.status === 'loading' ? '加载中…' : '加载更多任务' }}
        </button>

        <p
          v-if="taskLimitReached || taskIdsIssue"
          :id="taskIdsErrorId"
          class="text-sm text-[var(--color-danger)]"
          role="alert"
          aria-live="assertive"
          data-testid="review-task-limit"
        >
          {{ taskIdsIssue || `最多关联 ${MAX_WEEKLY_REVIEW_TASKS} 个任务。` }}
        </p>
      </div>

      <div v-if="taskIds.length > 0" class="space-y-2">
        <h4 class="text-sm font-bold text-[var(--color-text-body)]">已关联任务</h4>
        <div class="flex max-h-40 flex-wrap gap-2 overflow-y-auto" data-testid="review-selected-tasks">
          <span
            v-for="taskId in taskIds"
            :key="taskId"
            class="inline-flex max-w-full items-center gap-2 rounded-full bg-[var(--color-primary-soft-2)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-body)]"
          >
            <span class="truncate">{{ selectedTaskLabel(taskId) }}</span>
            <button
              type="button"
              class="focus-ring rounded-full text-[var(--color-text-secondary)] hover:text-[var(--color-danger)]"
              :disabled="disabled"
              :aria-label="`取消关联${selectedTaskLabel(taskId)}`"
              :data-remove-task-id="taskId"
              @click="$emit('unselectTask', taskId)"
            >
              ×
            </button>
          </span>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import type {
  AssociationLoadState,
  ReviewTaskBucket,
} from '@/composables/useWeeklyReviewAssociations'
import type { ProjectContext } from '@/types/project'
import type { NormalizedReviewVisibilityScope } from '@/types/review'
import type { WeeklyReviewFormIssue } from '@/utils/weeklyReviewForm'
import { MAX_WEEKLY_REVIEW_TASKS } from '@/utils/weeklyReviewForm'

const props = withDefaults(defineProps<{
  visibilityScope: NormalizedReviewVisibilityScope
  teamId: string | null
  focusProjectId: string | null
  taskIds: readonly string[]
  projects: readonly ProjectContext[]
  projectLoadState: AssociationLoadState
  projectHasMore?: boolean
  activeTaskProjectId: string | null
  taskBucketsByProjectId: Readonly<Record<string, ReviewTaskBucket>>
  accessMessage?: string | null
  issues?: readonly WeeklyReviewFormIssue[]
  disabled?: boolean
}>(), {
  projectHasMore: false,
  accessMessage: null,
  issues: () => [],
  disabled: false,
})

const emit = defineEmits<{
  'update:focusProjectId': [projectId: string | null]
  selectTask: [taskId: string]
  unselectTask: [taskId: string]
  openTaskProject: [projectId: string | null]
  loadMoreProjects: []
  loadMoreProjectTasks: [projectId: string]
  retryProjects: []
  retryProjectTasks: [projectId: string]
}>()

const instanceId = `review-association-${Math.random().toString(36).slice(2)}`
const focusProjectSelectId = `${instanceId}-focus-project`
const focusProjectErrorId = `${instanceId}-focus-project-error`
const taskProjectSelectId = `${instanceId}-task-project`
const taskIdsErrorId = `${instanceId}-tasks-error`

const TASK_STATUS_LABELS: Readonly<Record<number, string>> = {
  0: '未完成',
  1: '一般完成',
  2: '正常完成',
  3: '超额完成',
}

const focusProjectSelectRef = ref<HTMLSelectElement | null>(null)
const taskListRef = ref<HTMLElement | null>(null)
const taskSectionRef = ref<HTMLElement | null>(null)

const selectedTaskIdSet = computed(() => new Set(props.taskIds))
const taskLimitReached = computed(() => props.taskIds.length >= MAX_WEEKLY_REVIEW_TASKS)
const unresolvedFocusProjectId = computed(() => (
  props.focusProjectId && !props.projects.some((project) => project.id === props.focusProjectId)
    ? props.focusProjectId
    : null
))
const activeTaskBucket = computed(() => (
  props.activeTaskProjectId
    ? props.taskBucketsByProjectId[props.activeTaskProjectId] ?? null
    : null
))
const activeTasks = computed(() => activeTaskBucket.value?.records ?? [])
const loadedTaskById = computed(() => {
  const byId = new Map<string, ReviewTaskBucket['records'][number]>()
  Object.values(props.taskBucketsByProjectId).forEach((bucket) => {
    bucket.records.forEach((task) => byId.set(task.id, task))
  })
  return byId
})

const issueMessage = (field: WeeklyReviewFormIssue['field']) => {
  const issue = props.issues.find((value) => value.field === field)
  if (!issue) return ''
  if (issue.code === 'INVALID_FOCUS_PROJECT_ID') return '当前重点项目无效，请重新选择。'
  if (issue.code === 'TASK_LIMIT_EXCEEDED') return `最多关联 ${MAX_WEEKLY_REVIEW_TASKS} 个任务。`
  if (issue.code === 'INVALID_TASK_ID') return '关联任务中包含无效任务，请重新选择。'
  return '当前关联资源无效，请重新选择。'
}

const focusProjectIssue = computed(() => issueMessage('focusProjectId'))
const taskIdsIssue = computed(() => issueMessage('taskIds'))
const focusProjectDescribedBy = computed(() => (
  focusProjectIssue.value ? focusProjectErrorId : undefined
))
const taskIdsDescribedBy = computed(() => (
  taskLimitReached.value || taskIdsIssue.value ? taskIdsErrorId : undefined
))

const getTaskStatusLabel = (status: unknown) => {
  const statusValue = Number(status)

  if (!Number.isInteger(statusValue) || Number.isNaN(statusValue)) {
    return '未知状态'
  }

  return TASK_STATUS_LABELS[statusValue] ?? `未知状态（${status}）`
}

const handleFocusProjectChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  emit('update:focusProjectId', value || null)
}

const handleTaskProjectChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  emit('openTaskProject', value || null)
}

const handleTaskToggle = (taskId: string, event: Event) => {
  const checked = (event.target as HTMLInputElement).checked
  if (checked) emit('selectTask', taskId)
  else emit('unselectTask', taskId)
}

const isTaskSelectionDisabled = (taskId: string) => (
  taskLimitReached.value && !selectedTaskIdSet.value.has(taskId)
)

const selectedTaskLabel = (taskId: string) => {
  const task = loadedTaskById.value.get(taskId)
  return task?.title || `任务 #${taskId}（详情尚未加载）`
}

const focusIssue = (field: WeeklyReviewFormIssue['field']) => {
  if (field === 'focusProjectId') {
    focusProjectSelectRef.value?.focus()
    return true
  }
  if (field === 'taskIds') {
    ;(taskListRef.value ?? taskSectionRef.value)?.focus()
    return true
  }
  return false
}

defineExpose({ focusIssue })
</script>
