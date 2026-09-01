<template>
  <main class="relative flex flex-1 flex-col overflow-y-auto bg-[var(--color-bg-page)] p-4 sm:p-6 lg:p-8">
    <div class="mx-auto w-full max-w-6xl space-y-6">
      <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 class="flex items-center gap-2 text-xl font-bold text-[var(--color-text-primary)] sm:text-2xl">
          <AppIcon name="calendar" class="h-5 w-5" />
          周报回顾
        </h2>
        <span class="text-sm text-[var(--color-text-secondary)]">看看这周做得怎么样</span>
      </div>

      <div class="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-6">
        <div class="space-y-6 xl:col-span-2">
          <div
            class="card-base rounded-2xl border-[var(--color-primary-soft-2)] bg-[var(--color-bg-surface)] p-5 sm:p-6"
          >
            <div class="flex flex-col gap-5">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div class="min-w-0">
                  <div class="mb-1 text-sm font-medium text-[var(--color-text-secondary)]">
                    第 {{ currentReview.weekNo || '?' }} 周 ({{ currentReview.startDate || '--' }} ~
                    {{ currentReview.endDate || '--' }})
                  </div>
                  <div class="text-2xl font-bold text-[var(--color-text-primary)]">本周任务摘要看板</div>
                  <p class="mt-1 text-sm text-[var(--color-text-secondary)]">
                    这里会自动汇总本周完成情况，并和上周做对比。
                  </p>
                </div>

                <button
                  @click="jumpToRelatedTasks"
                  class="btn-secondary rounded-lg px-4 py-2 text-sm font-bold"
                >
                  查看任务页
                </button>
              </div>

              <div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <div
                  v-for="card in summaryCards"
                  :key="card.label"
                  class="rounded-2xl px-4 py-4"
                  :class="card.containerClass"
                >
                  <div class="text-xs font-medium text-[var(--color-text-secondary)]">{{ card.label }}</div>
                  <div class="mono mt-2 text-3xl font-black" :class="card.valueClass">{{ card.value }}</div>
                  <div class="mt-2 text-xs" :class="card.hintClass">{{ card.hint }}</div>
                </div>
              </div>

              <div
                class="flex flex-wrap items-center gap-2 text-sm"
                :class="summaryNoticeToneClass"
              >
                <AppIcon
                  v-if="summaryNoticeIcon"
                  :name="summaryNoticeIcon"
                  class="h-4 w-4"
                />
                <span>{{ summaryNoticeText }}</span>
              </div>
            </div>
          </div>

          <div class="card-base space-y-6 rounded-2xl bg-[var(--color-bg-surface)] p-5 sm:p-6">
            <ReviewVisibilityFields
              ref="visibilityFieldsRef"
              :visibility-scope="reviewForm.visibilityScope"
              :team-id="reviewForm.teamId"
              :shared-summary="reviewForm.sharedSummary"
              :teams="collaborationStore.teams"
              :teams-loading="collaborationStore.teamsLoadState.status === 'loading'"
              :teams-error="teamLoadError"
              :issues="formIssues"
              :disabled="isSaving"
              @update:visibility-scope="handleVisibilityChange"
              @update:team-id="handleTeamChange"
              @update:shared-summary="handleSharedSummaryChange"
              @retry-teams="loadCollaborationContext(true)"
            />

            <ReviewAssociationPicker
              ref="associationPickerRef"
              :visibility-scope="reviewForm.visibilityScope"
              :team-id="reviewForm.teamId"
              :focus-project-id="reviewForm.focusProjectId"
              :task-ids="reviewForm.taskIds"
              :projects="associationProjects"
              :project-load-state="associationProjectLoadState"
              :project-has-more="associationProjectHasMore"
              :active-task-project-id="activeTaskProjectId"
              :task-buckets-by-project-id="associationTaskBuckets"
              :access-message="associationAccessMessage"
              :issues="formIssues"
              :disabled="isSaving"
              @update:focus-project-id="handleFocusProjectChange"
              @select-task="handleTaskSelect"
              @unselect-task="handleTaskUnselect"
              @open-task-project="handleOpenTaskProject"
              @load-more-projects="handleLoadMoreAssociationProjects"
              @load-more-project-tasks="handleLoadMoreAssociationTasks"
              @retry-projects="handleRetryAssociationProjects"
              @retry-project-tasks="handleRetryAssociationTasks"
            />

            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-bold text-[var(--color-text-body)] flex items-center gap-2">
                  <AppIcon name="brain" class="h-4 w-4" />
                  本周复盘
                </label>

                <button
                  @click="handleAiPolish"
                  :disabled="isPolishing"
                  class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all"
                  :class="
                    isPolishing
                      ? 'bg-[var(--color-disabled-bg)] text-[var(--color-disabled-text)] cursor-not-allowed'
                      : 'btn-ai'
                  "
                >
                  <svg
                    v-if="isPolishing"
                    class="animate-spin h-3 w-3 text-[var(--color-disabled-text)]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    ></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <AppIcon v-else name="sparkles" class="h-3 w-3" />
                  {{ isPolishing ? 'AI 处理中...' : 'AI 润色复盘' }}
                </button>
              </div>
              <textarea
                v-model="reviewForm.reflection"
                :disabled="isPolishing"
                class="focus-ring min-h-[120px] w-full resize-none rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] p-4 text-sm text-[var(--color-text-body)]"
                placeholder="可选补充内容（如感受、问题与改进点）..."
              ></textarea>
            </div>

            <div class="flex justify-end pt-2">
              <button
                @click="openSaveModal"
                :disabled="isSaving || reviewForm.visibilityScope === 'UNKNOWN'"
                class="btn-primary flex items-center gap-2 rounded-2xl px-7 py-3 font-bold"
                :class="isSaving || reviewForm.visibilityScope === 'UNKNOWN' ? 'cursor-not-allowed opacity-70' : ''"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  ></path>
                </svg>
                保存本周总结
              </button>
            </div>
          </div>
        </div>

        <div
          class="card-base flex max-h-[420px] flex-col rounded-2xl bg-[var(--color-bg-surface)] p-5 sm:p-6 xl:max-h-[calc(100vh-12rem)]"
        >
          <h3 class="text-lg font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
            <AppIcon name="history" class="h-5 w-5" />
            历史轨迹
          </h3>
          <div class="flex-1 overflow-y-auto space-y-4 pr-2">
            <div v-if="historyReviews.length === 0" class="mt-10 text-center text-sm text-[var(--color-text-tertiary)]">
              暂无历史记录
            </div>

            <div
              v-for="item in historyReviews"
              :key="item.id || `${item.year}-${item.weekNo}`"
              @click="item.id && viewDetail(item.id)"
              class="relative group cursor-pointer border-l-2 border-[var(--color-timeline-line)] py-2 pl-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
            >
              <div
                class="absolute -left-[7px] top-3 h-3 w-3 rounded-full border-2 border-[var(--color-bg-surface)] bg-[var(--color-timeline-dot)]"
              ></div>
              <div class="text-xs font-medium text-[var(--color-text-tertiary)] mb-1">
                {{ item.year }} 年 • 第 {{ item.weekNo }} 周
              </div>
              <div class="rounded-lg bg-[var(--color-bg-surface-muted)] p-3 transition-colors group-hover:bg-[var(--color-bg-surface-secondary)]">
                <div class="text-sm font-bold text-[var(--color-text-body)] mb-1 line-clamp-1">
                  {{ item.focusProjectName || '日常推进' }}
                </div>
                <div class="text-xs text-[var(--color-text-secondary)] line-clamp-2">
                  {{ item.reflection || '无复盘内容' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <AppConfirmDialog
      v-model="showSaveConfirmModal"
      icon-name="save"
      :title="saveConfirmTitle"
      :message="saveConfirmMessage"
      :confirm-text="saveConfirmText"
      cancel-text="取消"
      :loading="isSaving"
      @confirm="executeSave"
      @cancel="pendingMutation = null"
    />

    <div
      v-if="showDetailModal && selectedReview"
      class="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-[var(--color-backdrop-strong)] p-4 backdrop-blur-md"
    >
      <div
        class="surface-panel flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl"
      >
        <div class="flex items-center justify-between border-b border-[var(--color-divider-muted)] bg-[var(--color-bg-surface-muted)]/60 p-6">
          <div>
            <h3 class="text-xl font-black text-[var(--color-text-primary)]">
              {{ selectedReview.year }} 年 第 {{ selectedReview.weekNo }} 周总结
            </h3>
            <p class="mt-1 text-xs text-[var(--color-text-tertiary)]">
              {{ selectedReview.startDate }} ~ {{ selectedReview.endDate }}
            </p>
          </div>
          <button
            @click="showDetailModal = false"
            class="rounded p-2 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-menu-hover)] hover:text-[var(--color-text-body)]"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-8 space-y-8">
          <section>
            <h4
              class="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[var(--color-text-body)]"
            >
              / 本周复盘 /
            </h4>
            <div
              class="whitespace-pre-wrap rounded-2xl border border-[var(--color-input-border)] bg-[var(--color-bg-surface-muted)] p-5 leading-relaxed text-[var(--color-text-body)]"
            >
              {{ selectedReview.reflection || '无内容' }}
            </div>
          </section>
        </div>
        <div class="bg-[var(--color-bg-surface-muted)] p-6 text-center">
          <div class="flex items-center justify-center gap-4">
            <button
              @click="handleEditReview"
              class="btn-secondary rounded-xl px-6 py-2.5 font-bold transition-all"
            >
              修改
            </button>
            <button
              @click="handleDeleteReview"
              class="rounded-xl bg-[var(--color-danger-soft)] px-6 py-2.5 font-bold text-[var(--color-danger)] transition-all hover:brightness-95"
            >
              删除
            </button>
            <button
              @click="exportToMarkdown"
              class="btn-secondary flex items-center gap-2 rounded-xl px-6 py-2.5 font-bold transition-all"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                ></path>
              </svg>
              导出 MD
            </button>
            <button
              @click="showDetailModal = false"
              class="btn-secondary rounded-xl px-8 py-2.5 font-bold transition-all"
            >
              阅读完毕
            </button>
          </div>
        </div>
      </div>
    </div>

    <AppConfirmDialog
      v-model="showDeleteConfirmModal"
      variant="danger"
      icon-name="trash"
      title="确认删除这条周总结？"
      message="删除后将无法恢复，建议确认内容已经不再需要。"
      confirm-text="确认删除"
      cancel-text="取消"
      @confirm="executeDelete"
    />
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppConfirmDialog from '@/components/AppConfirmDialog.vue'
import AppIcon, { type IconName } from '@/components/AppIcon.vue'
import ReviewAssociationPicker from '@/components/review/ReviewAssociationPicker.vue'
import ReviewVisibilityFields from '@/components/review/ReviewVisibilityFields.vue'
import { aiPolishApi } from '@/api/ai'
import { useAiPendingRequest } from '@/composables/useAiPendingRequest'
import { useWeeklyReviewAssociations } from '@/composables/useWeeklyReviewAssociations'
import { fetchProjectList } from '@/api/project'
import { fetchTaskList } from '@/api/task'
import {
  deleteReviewApi,
  fetchCurrentReview,
  fetchReviewHistory,
  getReviewDetailApi,
  saveWeeklyReviewApi,
  updateWeeklyReviewApi,
} from '@/api/review'
import { AI_PENDING_BOARDS, useAiPendingRegistryStore } from '@/stores/aiPendingRegistry'
import { useCollaborationStore } from '@/stores/collaboration'
import { useToast } from '@/composables/useToast'
import { useUndoDelete } from '@/composables/useUndoDelete'
import {
  normalizeCurrentWeeklyReviewWire,
  normalizePersistedWeeklyReviewWire,
} from '@/types/normalization'
import type {
  ReviewWriteVisibilityScope,
  WeeklyReviewDetail,
  WeeklyReviewSavePayload,
  WeeklyReviewUpdatePayload,
} from '@/types/review'
import {
  buildWeeklyReviewSavePayload,
  buildWeeklyReviewUpdatePayload,
  changeWeeklyReviewFocusProject,
  changeWeeklyReviewTargetTeam,
  changeWeeklyReviewVisibility,
  createDefaultWeeklyReviewForm,
  createWeeklyReviewFormFromDetail,
  invalidateWeeklyReviewTargetTeam,
  selectWeeklyReviewTask,
  type WeeklyReviewFormIssue,
  type WeeklyReviewFormState,
  unselectWeeklyReviewTask,
} from '@/utils/weeklyReviewForm'
import { classifyApiError } from '@/utils/request'
import { isTaskCompleted } from '@/utils/taskStatus'

interface ProjectItem {
  id: string | number
  name: string
}

interface TaskItem {
  id: string | number
  status: number
  projectId: string | number
  dueDate?: string | null
}

interface TaskListResponse {
  records?: TaskItem[]
}

interface SummaryMetrics {
  completedCount: number | null
  assignedCount: number | null
  completionRate: string
  wowRate: string
  completedDiff: number | null
  completionRateDiff: number | null
  currentCompletedRaw: number | null
  currentAssignedRaw: number | null
  previousCompletedRaw: number | null
  previousAssignedRaw: number | null
  currentCompletionRateRaw: number | null
  previousCompletionRateRaw: number | null
}

interface SummaryCardView {
  label: string
  value: string
  hint: string
  containerClass: string
  valueClass: string
  hintClass: string
}

type PendingWeeklyReviewMutation =
  | { mode: 'save'; payload: WeeklyReviewSavePayload; targetTeamName: string | null }
  | { mode: 'update'; payload: WeeklyReviewUpdatePayload; targetTeamName: string | null }

const createEmptyReviewDetail = (): WeeklyReviewDetail => ({
  id: null,
  authorUserId: null,
  year: 0,
  weekNo: 0,
  startDate: null,
  endDate: null,
  completedTaskCount: 0,
  visibilityScope: 'PRIVATE',
  teamId: null,
  focusProjectId: null,
  focusProjectName: null,
  sharedSummary: '',
  reflection: '',
  nextPlan: '',
  taskIds: [],
  createTime: null,
  updateTime: null,
})

const SUMMARY_PAGE_SIZE = 100
const MAX_PAGES_PER_PROJECT = 10
const MAX_TOTAL_REQUESTS = 60
const MAX_CONCURRENT_PROJECT_FETCHES = 3
const TIMEZONE_BASELINE = 'Asia/Shanghai'
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DATE_KEY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIMEZONE_BASELINE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const router = useRouter()
const toast = useToast()
const undoDelete = useUndoDelete()
const aiPendingRegistry = useAiPendingRegistryStore()
const collaborationStore = useCollaborationStore()
const reviewAssociations = useWeeklyReviewAssociations()
const { runAiRequest } = useAiPendingRequest()

const currentReview = ref<WeeklyReviewDetail>(createEmptyReviewDetail())
const historyReviews = ref<WeeklyReviewDetail[]>([])
const reviewForm = ref<WeeklyReviewFormState>(createDefaultWeeklyReviewForm(0, 0))
const formIssues = ref<WeeklyReviewFormIssue[]>([])
const pendingMutation = ref<PendingWeeklyReviewMutation | null>(null)
const isSaving = ref(false)
const visibilityFieldsRef = ref<InstanceType<typeof ReviewVisibilityFields> | null>(null)
const associationPickerRef = ref<InstanceType<typeof ReviewAssociationPicker> | null>(null)
const activeTaskProjectId = ref<string | null>(null)
const associationAccessMessage = ref<string | null>(null)
const associationProjects = reviewAssociations.projects
const associationProjectLoadState = reviewAssociations.projectLoadState
const associationProjectHasMore = reviewAssociations.projectHasMore
const associationTaskBuckets = reviewAssociations.taskBucketsByProjectId
const isViewMounted = ref(false)
const showDetailModal = ref(false)
const selectedReview = ref<WeeklyReviewDetail | null>(null)
const showSaveConfirmModal = ref(false)
const showDeleteConfirmModal = ref(false)
const summaryLoading = ref(false)
const summaryReady = ref(false)
const summaryError = ref('')
const summaryGuardHit = ref(false)
const weeklyCompletedTaskIds = ref<string[]>([])
const summaryMetrics = ref<SummaryMetrics>({
  completedCount: null,
  assignedCount: null,
  completionRate: '--',
  wowRate: '--',
  completedDiff: null,
  completionRateDiff: null,
  currentCompletedRaw: null,
  currentAssignedRaw: null,
  previousCompletedRaw: null,
  previousAssignedRaw: null,
  currentCompletionRateRaw: null,
  previousCompletionRateRaw: null,
})

const weeklyPolishEntry = computed(() => aiPendingRegistry.boards[AI_PENDING_BOARDS.WEEKLY_REVIEW_POLISH])
const isPolishing = computed(() => weeklyPolishEntry.value.status === 'pending')
const teamLoadError = computed(() => (
  collaborationStore.teamsLoadState.status === 'error'
    ? collaborationStore.teamsLoadState.errorMessage || '团队加载失败，请稍后重试。'
    : null
))
const saveConfirmTitle = computed(() => (
  pendingMutation.value?.payload.visibilityScope === 'TEAM'
    ? `确认向「${pendingMutation.value.targetTeamName || '所选团队'}」共享摘要？`
    : '确认保存为私人复盘？'
))
const saveConfirmMessage = computed(() => (
  pendingMutation.value?.payload.visibilityScope === 'TEAM'
    ? '仅共享单独填写的摘要。本周复盘、下周计划和关联任务仍然只有你自己可见。'
    : '本周复盘仅你自己可见，不会出现在团队动态中。'
))
const saveConfirmText = computed(() => (
  pendingMutation.value?.payload.visibilityScope === 'TEAM'
    ? '保存并共享摘要'
    : '保存私人复盘'
))

const clearFormIssues = (...fields: WeeklyReviewFormIssue['field'][]) => {
  const fieldSet = new Set(fields)
  formIssues.value = formIssues.value.filter((issue) => !fieldSet.has(issue.field))
}

const loadCollaborationContext = async (force = false) => {
  try {
    await collaborationStore.bootstrapCollaborationContext({ force })
  } catch (error) {
    console.error('加载周复盘团队上下文失败', error)
  }
}

const associationReviewKey = () => (
  reviewForm.value.id
    ? `review:${reviewForm.value.id}`
    : `draft:${reviewForm.value.year}-${reviewForm.value.weekNo}`
)

const resetAssociationContext = () => {
  if (reviewAssociations.activeContext.value) reviewAssociations.resetContext()
  activeTaskProjectId.value = null
  associationAccessMessage.value = null
}

const activateAssociationContext = async (force = false) => {
  const scope = reviewForm.value.visibilityScope
  if (scope === 'UNKNOWN' || (scope === 'TEAM' && !reviewForm.value.teamId)) {
    resetAssociationContext()
    return
  }

  const context = {
    reviewKey: associationReviewKey(),
    visibilityScope: scope,
    teamId: scope === 'TEAM' ? reviewForm.value.teamId : null,
  } as const
  const desiredKey = `${context.reviewKey}:${context.visibilityScope}:${context.teamId ?? '-'}`

  if (reviewAssociations.contextKey.value !== desiredKey) {
    reviewAssociations.setContext(context)
    activeTaskProjectId.value = null
  }

  associationAccessMessage.value = null
  reviewAssociations.clearAccessSignal()
  try {
    await reviewAssociations.ensureProjects({ force })
  } catch (error) {
    console.error('加载周复盘关联项目失败', error)
  }
}

const handleVisibilityChange = (scope: ReviewWriteVisibilityScope) => {
  reviewForm.value = changeWeeklyReviewVisibility(reviewForm.value, scope)
  clearFormIssues('visibilityScope', 'teamId', 'focusProjectId', 'taskIds')
  if (scope === 'PRIVATE') clearFormIssues('sharedSummary')
  if (scope === 'TEAM' && collaborationStore.teamsLoadState.status !== 'ready') {
    void loadCollaborationContext()
  }
  void activateAssociationContext()
}

const handleTeamChange = (teamId: string | null) => {
  reviewForm.value = changeWeeklyReviewTargetTeam(reviewForm.value, teamId)
  clearFormIssues('teamId', 'focusProjectId', 'taskIds')
  void activateAssociationContext()
}

const handleSharedSummaryChange = (sharedSummary: string) => {
  reviewForm.value = { ...reviewForm.value, sharedSummary }
  if (sharedSummary.trim()) clearFormIssues('sharedSummary')
}

const handleFocusProjectChange = (projectId: string | null) => {
  const result = changeWeeklyReviewFocusProject(reviewForm.value, projectId)
  if (!result.ok) {
    formIssues.value = [
      ...formIssues.value.filter((issue) => issue.field !== 'focusProjectId'),
      { field: 'focusProjectId', code: 'INVALID_FOCUS_PROJECT_ID' },
    ]
    return
  }
  reviewForm.value = result.form
  clearFormIssues('focusProjectId')
}

const handleTaskSelect = (taskId: string) => {
  const result = selectWeeklyReviewTask(reviewForm.value, taskId)
  if (!result.ok) {
    const code = result.reason === 'TASK_LIMIT_REACHED'
      ? 'TASK_LIMIT_EXCEEDED'
      : 'INVALID_TASK_ID'
    formIssues.value = [
      ...formIssues.value.filter((issue) => issue.field !== 'taskIds'),
      { field: 'taskIds', code },
    ]
    return
  }
  reviewForm.value = result.form
  clearFormIssues('taskIds')
}

const handleTaskUnselect = (taskId: string) => {
  const result = unselectWeeklyReviewTask(reviewForm.value, taskId)
  if (!result.ok) return
  reviewForm.value = result.form
  clearFormIssues('taskIds')
}

const handleOpenTaskProject = (projectId: string | null) => {
  activeTaskProjectId.value = projectId
  if (!projectId) return
  void reviewAssociations.ensureProjectTasks(projectId).catch((error) => {
    console.error('加载周复盘关联任务失败', error)
  })
}

const handleLoadMoreAssociationProjects = () => {
  void reviewAssociations.loadMoreProjects().catch((error) => {
    console.error('加载更多周复盘关联项目失败', error)
  })
}

const handleLoadMoreAssociationTasks = (projectId: string) => {
  void reviewAssociations.loadMoreProjectTasks(projectId).catch((error) => {
    console.error('加载更多周复盘关联任务失败', error)
  })
}

const handleRetryAssociationProjects = () => {
  associationAccessMessage.value = null
  reviewAssociations.clearAccessSignal()
  void activateAssociationContext(true)
}

const handleRetryAssociationTasks = (projectId: string) => {
  associationAccessMessage.value = null
  reviewAssociations.clearAccessSignal()
  void reviewAssociations.retryProjectTasks(projectId).catch((error) => {
    console.error('重新加载周复盘关联任务失败', error)
  })
}

const jumpToRelatedTasks = async () => {
  try {
    await router.push('/tasks')
  } catch (error) {
    console.error('周报跳转失败', error)
    toast.error('跳转失败，请检查网络后重试。')
  }
}

const formatDateKeyInTimeZone = (date: Date) => {
  return DATE_KEY_FORMATTER.formatToParts(date).reduce((acc, part) => {
    if (part.type === 'year') return `${part.value}-`
    if (part.type === 'month') return `${acc}${part.value}-`
    if (part.type === 'day') return `${acc}${part.value}`
    return acc
  }, '')
}

const normalizeDueDateKey = (value?: string | null) => {
  if (!value) return ''
  const trimmed = value.trim()
  if (DATE_KEY_PATTERN.test(trimmed)) return trimmed

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return ''

  return formatDateKeyInTimeZone(parsed)
}

const parseDateKeyToUtc = (dateKey: string) => {
  if (!DATE_KEY_PATTERN.test(dateKey)) return null
  const [year, month, day] = dateKey.split('-').map(Number)
  const timestamp = Date.UTC(year || 0, (month || 1) - 1, day || 1)
  return Number.isNaN(timestamp) ? null : timestamp
}

const shiftDateKey = (dateKey: string, offsetDays: number) => {
  const timestamp = parseDateKeyToUtc(dateKey)
  if (timestamp === null) return ''

  const shifted = new Date(timestamp + offsetDays * 24 * 60 * 60 * 1000)
  const year = shifted.getUTCFullYear()
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const day = String(shifted.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isDateKeyWithinRange = (dateKey: string, startDate: string, endDate: string) => {
  return dateKey >= startDate && dateKey <= endDate
}

const calcRate = (completed: number, assigned: number) => {
  if (assigned === 0) return null
  return (completed / assigned) * 100
}

const formatRate = (rate: number | null) => {
  return rate === null ? '--' : `${rate.toFixed(1)}%`
}

const formatWow = (currentRate: number | null, previousRate: number | null) => {
  if (currentRate === null || previousRate === null) return '--'

  const diff = currentRate - previousRate
  const prefix = diff > 0 ? '+' : ''
  return `${prefix}${diff.toFixed(1)}pp`
}

const calcWeekMetrics = (tasks: TaskItem[], startDate: string, endDate: string): SummaryMetrics => {
  const previousStartDate = shiftDateKey(startDate, -7)
  const previousEndDate = shiftDateKey(endDate, -7)

  let currentAssignedCount = 0
  let currentCompletedCount = 0
  let previousAssignedCount = 0
  let previousCompletedCount = 0

  tasks.forEach((task) => {
    const dueDateKey = normalizeDueDateKey(task.dueDate)
    if (!dueDateKey) return

    if (isDateKeyWithinRange(dueDateKey, startDate, endDate)) {
      currentAssignedCount += 1
      if (isTaskCompleted(task.status)) {
        currentCompletedCount += 1
      }
      return
    }

    if (previousStartDate && previousEndDate && isDateKeyWithinRange(dueDateKey, previousStartDate, previousEndDate)) {
      previousAssignedCount += 1
      if (isTaskCompleted(task.status)) {
        previousCompletedCount += 1
      }
    }
  })

  const currentRate = calcRate(currentCompletedCount, currentAssignedCount)
  const previousRate = calcRate(previousCompletedCount, previousAssignedCount)
  const completedDiff = currentCompletedCount - previousCompletedCount
  const completionRateDiff =
    currentRate === null || previousRate === null ? null : currentRate - previousRate

  return {
    completedCount: currentCompletedCount,
    assignedCount: currentAssignedCount,
    completionRate: formatRate(currentRate),
    wowRate: formatWow(currentRate, previousRate),
    completedDiff,
    completionRateDiff,
    currentCompletedRaw: currentCompletedCount,
    currentAssignedRaw: currentAssignedCount,
    previousCompletedRaw: previousCompletedCount,
    previousAssignedRaw: previousAssignedCount,
    currentCompletionRateRaw: currentRate,
    previousCompletionRateRaw: previousRate,
  }
}

const collectCompletedTaskIdsInRange = (tasks: TaskItem[], startDate: string, endDate: string) => {
  const idSet = new Set<string>()

  tasks.forEach((task) => {
    const dueDateKey = normalizeDueDateKey(task.dueDate)
    if (!dueDateKey || !isDateKeyWithinRange(dueDateKey, startDate, endDate)) return
    if (!isTaskCompleted(task.status)) return

    const normalizedId = String(task.id).trim()
    if (normalizedId) idSet.add(normalizedId)
  })

  return Array.from(idSet)
}

const createSummaryPlaceholder = (): SummaryMetrics => ({
  completedCount: null,
  assignedCount: null,
  completionRate: '--',
  wowRate: '--',
  completedDiff: null,
  completionRateDiff: null,
  currentCompletedRaw: null,
  currentAssignedRaw: null,
  previousCompletedRaw: null,
  previousAssignedRaw: null,
  currentCompletionRateRaw: null,
  previousCompletionRateRaw: null,
})

const hydrateSummaryMetrics = async () => {
  summaryLoading.value = true
  summaryReady.value = false
  summaryError.value = ''
  summaryGuardHit.value = false

  const startDate = normalizeDueDateKey(currentReview.value.startDate)
  const endDate = normalizeDueDateKey(currentReview.value.endDate)

  if (!startDate || !endDate) {
    summaryMetrics.value = createSummaryPlaceholder()
    weeklyCompletedTaskIds.value = []
    summaryReady.value = true
    summaryLoading.value = false
    summaryError.value = '本周时间范围暂未设置，先填写后可自动生成看板。'
    return
  }

  try {
    const projectResponse = await fetchProjectList()
    const projects = (projectResponse as { records?: ProjectItem[] })?.records || []
    const guardState = {
      totalRequests: 0,
      hit: false,
      reason: '',
    }

    const fetchProjectTasks = async (projectId: string | number) => {
      const projectTasks: TaskItem[] = []
      let currentPage = 1

      while (currentPage <= MAX_PAGES_PER_PROJECT && !guardState.hit) {
        if (guardState.totalRequests >= MAX_TOTAL_REQUESTS) {
          guardState.hit = true
          guardState.reason = '数据较多，当前先展示主要结果。'
          break
        }

        guardState.totalRequests += 1
        const response = await fetchTaskList({
          projectId,
          current: currentPage,
          size: SUMMARY_PAGE_SIZE,
        })
        const records = ((response as TaskListResponse)?.records || []) as TaskItem[]

        projectTasks.push(...records)

        if (records.length === 0 || records.length < SUMMARY_PAGE_SIZE) {
          break
        }

        currentPage += 1
      }

      if (currentPage > MAX_PAGES_PER_PROJECT && !guardState.hit) {
        guardState.hit = true
        guardState.reason = '数据较多，当前先展示主要结果。'
      }

      return projectTasks
    }

    const allTasks: TaskItem[] = []

    for (let index = 0; index < projects.length; index += MAX_CONCURRENT_PROJECT_FETCHES) {
      if (guardState.hit) break

      const chunk = projects.slice(index, index + MAX_CONCURRENT_PROJECT_FETCHES)
      const chunkResults = await Promise.all(chunk.map((project) => fetchProjectTasks(project.id)))
      chunkResults.forEach((records) => {
        allTasks.push(...records)
      })
    }

    const finalMetrics = calcWeekMetrics(allTasks, startDate, endDate)
    summaryMetrics.value = finalMetrics
    weeklyCompletedTaskIds.value = collectCompletedTaskIdsInRange(allTasks, startDate, endDate)
    currentReview.value.completedTaskCount = finalMetrics.completedCount ?? currentReview.value.completedTaskCount
    summaryGuardHit.value = guardState.hit
    if (guardState.reason) {
      summaryError.value = guardState.reason
    }
    summaryReady.value = true
  } catch (error) {
    console.error('加载摘要看板失败', error)
    summaryMetrics.value = createSummaryPlaceholder()
    weeklyCompletedTaskIds.value = []
    summaryError.value = '网络不太稳定，暂时没拿到最新数据，请稍后重试。'
  } finally {
    summaryLoading.value = false
  }
}

const summaryDisplayValue = (value: number | string | null) => {
  if (!summaryReady.value || summaryLoading.value) return '--'
  if (value === null || value === '') return '--'
  return String(value)
}

const hasPreviousWeekBaseline = computed(() => {
  const previousAssigned = summaryMetrics.value.previousAssignedRaw
  const previousCompleted = summaryMetrics.value.previousCompletedRaw
  return (previousAssigned ?? 0) > 0 || (previousCompleted ?? 0) > 0
})

const formatSignedCount = (value: number | null) => {
  if (value === null) return '--'
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${value}`
}

const getTrendTone = (diff: number | null): 'positive' | 'negative' | 'neutral' => {
  if (diff === null || diff === 0) return 'neutral'
  return diff > 0 ? 'positive' : 'negative'
}

const getSummaryCardToneClasses = (tone: 'positive' | 'negative' | 'neutral') => {
  if (tone === 'positive') {
    return {
      containerClass: 'bg-[var(--color-success-soft)]',
      valueClass: 'text-[var(--color-success)]',
      hintClass: 'text-[var(--color-success)]',
    }
  }

  if (tone === 'negative') {
    return {
      containerClass: 'bg-[var(--color-danger-soft)]',
      valueClass: 'text-[var(--color-danger)]',
      hintClass: 'text-[var(--color-danger)]',
    }
  }

  return {
    containerClass: 'bg-[var(--color-bg-surface-secondary)]',
    valueClass: 'text-[var(--color-text-primary)]',
    hintClass: 'text-[var(--color-text-secondary)]',
  }
}

const summaryCards = computed<SummaryCardView[]>(() => {
  const metric = summaryMetrics.value
  const completedTone =
    !summaryReady.value || !hasPreviousWeekBaseline.value
      ? 'neutral'
      : getTrendTone(metric.completedDiff)
  const completionRateTone =
    !summaryReady.value || metric.previousCompletionRateRaw === null
      ? 'neutral'
      : getTrendTone(metric.completionRateDiff)
  const completedDiffTone =
    !summaryReady.value || !hasPreviousWeekBaseline.value
      ? 'neutral'
      : getTrendTone(metric.completedDiff)
  const wowTone =
    !summaryReady.value || metric.previousCompletionRateRaw === null
      ? 'neutral'
      : getTrendTone(metric.completionRateDiff)

  const completedCountHint = !summaryReady.value
    ? '正在整理本周数据'
    : !hasPreviousWeekBaseline.value
      ? `本周共完成 ${metric.currentCompletedRaw ?? 0} 项`
      : `较上周 ${formatSignedCount(metric.completedDiff)} 项`

  const completionRateHint = !summaryReady.value
    ? '正在整理本周数据'
    : metric.currentAssignedRaw === 0
      ? '本周暂无安排任务'
      : metric.previousCompletionRateRaw === null
        ? `本周共安排 ${metric.currentAssignedRaw ?? 0} 项任务`
        : `较上周 ${metric.wowRate}`

  return [
    {
      label: '本周完成任务',
      value: summaryDisplayValue(metric.completedCount),
      hint: completedCountHint,
      ...getSummaryCardToneClasses(completedTone),
    },
    {
      label: '完成任务变化',
      value: summaryDisplayValue(
        summaryReady.value && hasPreviousWeekBaseline.value ? formatSignedCount(metric.completedDiff) : '--',
      ),
      hint: hasPreviousWeekBaseline.value ? `上周完成 ${metric.previousCompletedRaw ?? 0} 项` : '暂无上周数据',
      ...getSummaryCardToneClasses(completedDiffTone),
    },
    {
      label: '本周完成率',
      value: summaryDisplayValue(metric.completionRate),
      hint: completionRateHint,
      ...getSummaryCardToneClasses(completionRateTone),
    },
    {
      label: '完成率变化',
      value: summaryDisplayValue(metric.wowRate),
      hint: metric.previousCompletionRateRaw === null ? '暂无上周完成率可对比' : '绿色代表比上周更好，红色需要关注',
      ...getSummaryCardToneClasses(wowTone),
    },
  ]
})

const summaryNoticeText = computed(() => {
  if (summaryLoading.value) return '正在更新本周看板，请稍候。'
  if (summaryGuardHit.value) return summaryError.value || '数据较多，当前先展示已整理完成的结果。'
  if (summaryError.value) return summaryError.value
  if (!summaryReady.value) return '看板尚未准备好。'
  return '绿色表示比上周更好，红色表示需要重点关注。'
})

const summaryNoticeIcon = computed<IconName | null>(() => {
  if (summaryLoading.value) return 'info'
  if (summaryGuardHit.value || summaryError.value) return 'warning'
  return 'success'
})

const summaryNoticeToneClass = computed(() => {
  if (summaryLoading.value) return 'text-[var(--color-text-secondary)]'
  if (summaryGuardHit.value || summaryError.value) return 'text-[var(--color-warning)]'
  return 'text-[var(--color-success)]'
})

const loadReviewData = async () => {
  await loadAuthorReviewContext()
  consumePendingWeeklyPolish()
}

const loadAuthorReviewContext = async (): Promise<boolean> => {
  try {
    const currentRes = await fetchCurrentReview()
    const normalizedCurrent = normalizeCurrentWeeklyReviewWire(currentRes)
    if (!normalizedCurrent) throw new TypeError('Invalid current weekly review response')

    const historyRes = await fetchReviewHistory()
    if (!Array.isArray(historyRes)) throw new TypeError('Invalid weekly review history response')
    const normalizedHistory = historyRes
      .map((review) => normalizePersistedWeeklyReviewWire(review))
      .filter((review): review is WeeklyReviewDetail & { id: string } => review !== null)

    currentReview.value = normalizedCurrent
    reviewForm.value = createWeeklyReviewFormFromDetail(normalizedCurrent)
    historyReviews.value = normalizedHistory
    formIssues.value = []
    void activateAssociationContext()
    await hydrateSummaryMetrics()
    return true
  } catch (error) {
    console.error('加载周报数据失败', error)
    summaryLoading.value = false
    summaryReady.value = false
    summaryError.value = '周报数据加载失败，请稍后重试。'
    return false
  }
}

const focusFirstFormIssue = async () => {
  const firstIssue = formIssues.value[0]
  if (!firstIssue) return
  await nextTick()
  if (visibilityFieldsRef.value?.focusIssue(firstIssue.field)) return
  associationPickerRef.value?.focusIssue(firstIssue.field)
}

const openSaveModal = async () => {
  if (reviewForm.value.visibilityScope === 'TEAM') {
    if (collaborationStore.teamsLoadState.status !== 'ready') {
      toast.error('团队信息尚未加载完成，请稍后重试或改为仅自己可见。')
      void loadCollaborationContext()
      return
    }
    if (!reviewForm.value.teamId || !collaborationStore.getTeam(reviewForm.value.teamId)) {
      reviewForm.value = invalidateWeeklyReviewTargetTeam(reviewForm.value)
    }
  }

  if (reviewForm.value.id) {
    const result = buildWeeklyReviewUpdatePayload(reviewForm.value)
    if (!result.ok) {
      formIssues.value = result.issues
      toast.error('请先修正周复盘表单中的问题。')
      await focusFirstFormIssue()
      return
    }
    pendingMutation.value = {
      mode: 'update',
      payload: result.payload,
      targetTeamName: result.payload.teamId
        ? collaborationStore.getTeam(result.payload.teamId)?.name ?? null
        : null,
    }
  } else {
    const result = buildWeeklyReviewSavePayload(reviewForm.value)
    if (!result.ok) {
      formIssues.value = result.issues
      toast.error('请先修正周复盘表单中的问题。')
      await focusFirstFormIssue()
      return
    }
    pendingMutation.value = {
      mode: 'save',
      payload: result.payload,
      targetTeamName: result.payload.teamId
        ? collaborationStore.getTeam(result.payload.teamId)?.name ?? null
        : null,
    }
  }

  formIssues.value = []
  showSaveConfirmModal.value = true
}

const executeSave = async () => {
  const mutation = pendingMutation.value
  if (!mutation || isSaving.value) return
  isSaving.value = true
  try {
    if (mutation.mode === 'update') {
      await updateWeeklyReviewApi(mutation.payload)
    } else {
      await saveWeeklyReviewApi(mutation.payload)
    }

    showSaveConfirmModal.value = false
    pendingMutation.value = null
    const refreshed = await loadAuthorReviewContext()
    if (refreshed) {
      toast.success('保存成功。')
    } else {
      toast.warning('保存已完成，但最新内容加载失败，请刷新页面后确认。', 5000)
    }
  } catch (error) {
    const errorKind = classifyApiError(error)
    if (
      mutation.payload.visibilityScope === 'TEAM'
      && (errorKind === 'PERMISSION_DENIED' || errorKind === 'NOT_FOUND')
    ) {
      const lostTeamId = mutation.payload.teamId
      if (lostTeamId) collaborationStore.pruneTeamContext(lostTeamId)
      reviewForm.value = invalidateWeeklyReviewTargetTeam(reviewForm.value)
      resetAssociationContext()
      formIssues.value = [{ field: 'teamId', code: 'TEAM_REQUIRED' }]
      pendingMutation.value = null
      showSaveConfirmModal.value = false
      toast.error('当前团队已不可用，请重新选择团队或改为仅自己可见。')
      await focusFirstFormIssue()
      return
    }
    toast.error('保存失败，请检查网络后重试。')
  } finally {
    isSaving.value = false
  }
}

const viewDetail = async (id: number | string) => {
  try {
    const res = await getReviewDetailApi(id)
    const responseData = normalizePersistedWeeklyReviewWire(res)
    if (!responseData) throw new TypeError('Invalid weekly review detail response')
    selectedReview.value = responseData
    showDetailModal.value = true
  } catch {
    toast.error('获取详情失败，请稍后重试。')
  }
}

const handleDeleteReview = async () => {
  if (!selectedReview.value) return
  showDeleteConfirmModal.value = true
}

const executeDelete = async () => {
  if (!selectedReview.value?.id) return

  const reviewToDelete = { ...selectedReview.value }
  const reviewId = reviewToDelete.id
  if (!reviewId) return
  const reviewTitle = `${reviewToDelete.year}年第${reviewToDelete.weekNo}周总结`
  const snapshot = [...historyReviews.value]
  const removedIndex = snapshot.findIndex((item) => item.id === reviewId)

  historyReviews.value = snapshot.filter((item) => item.id !== reviewId)
  showDeleteConfirmModal.value = false
  showDetailModal.value = false
  selectedReview.value = null

  undoDelete.scheduleUndoDelete({
    label: `周报「${reviewTitle}」`,
    pendingMessage: `周报「${reviewTitle}」已移除，5 秒内可撤销。`,
    onCommit: async () => {
      await deleteReviewApi(reviewId)
    },
    onCommitSuccess: async () => {
      await loadAuthorReviewContext()
    },
    onRollback: async () => {
      if (!historyReviews.value.some((item) => item.id === reviewId)) {
        const next = [...historyReviews.value]
        const insertIndex = removedIndex >= 0 && removedIndex <= next.length ? removedIndex : next.length
        next.splice(insertIndex, 0, reviewToDelete)
        historyReviews.value = next
      }
    },
  })
}

const handleEditReview = () => {
  if (!selectedReview.value) return
  currentReview.value = { ...selectedReview.value, taskIds: [...selectedReview.value.taskIds] }
  reviewForm.value = createWeeklyReviewFormFromDetail(selectedReview.value)
  formIssues.value = []
  showDetailModal.value = false
  window.scrollTo({ top: 0, behavior: 'smooth' })
  toast.success('已加载至编辑器，修改后点击保存即可。')
}

const exportToMarkdown = () => {
  if (!selectedReview.value) return

  const review = selectedReview.value

  const markdownContent = `# ${review.year} 年第 ${review.weekNo} 周总结

> **周期**：${review.startDate} ~ ${review.endDate}
> **核心推进项目**：${review.focusProjectName || '无'}
> **完成任务数**：${review.completedTaskCount || 0} 个

---

## 本周复盘
${review.reflection || '无复盘内容'}

---
*由 [智径 SmartPath] 智能生成*
`

  const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${review.year}年第${review.weekNo}周总结.md`

  document.body.appendChild(link)
  link.click()

  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  toast.success('Markdown 导出成功。')
}

const applyWeeklyPolishResponse = (payload: unknown) => {
  if (payload && typeof payload === 'object') {
    const response = payload as { review?: unknown }
    if (typeof response.review === 'string' && response.review.trim()) {
      reviewForm.value = { ...reviewForm.value, reflection: response.review }
      return true
    }
  }

  if (typeof payload !== 'string' || !payload) return false

  try {
    const parsedData = JSON.parse(payload) as { review?: unknown }
    if (typeof parsedData.review === 'string' && parsedData.review.trim()) {
      reviewForm.value = { ...reviewForm.value, reflection: parsedData.review }
      return true
    }
  } catch {
    console.error('JSON 解析失败, AI 返回的原始数据为:', payload)
    reviewForm.value = { ...reviewForm.value, reflection: payload }
    toast.error('AI 返回格式异常，内容已填入复盘区，请手动调整。')
    return true
  }

  reviewForm.value = { ...reviewForm.value, reflection: payload }
  return true
}

const consumePendingWeeklyPolish = () => {
  const entry = weeklyPolishEntry.value
  if (entry.status !== 'success') return

  const applied = applyWeeklyPolishResponse(entry.responsePayload)
  if (applied) {
    aiPendingRegistry.markConsumed(AI_PENDING_BOARDS.WEEKLY_REVIEW_POLISH, entry.requestId)
  }
}

const handleAiPolish = async () => {
  const reflectionInput = reviewForm.value.reflection.trim()
  const taskIds = weeklyCompletedTaskIds.value.length > 0 ? weeklyCompletedTaskIds.value : undefined

  const result = await runAiRequest({
    board: AI_PENDING_BOARDS.WEEKLY_REVIEW_POLISH,
    requestMeta: {
      taskCount: taskIds?.length || 0,
      hasReflection: Boolean(reflectionInput),
    },
    request: () =>
      aiPolishApi({
        taskIds,
        reflection: reflectionInput || undefined,
      }),
    successMessage: '周报回顾 AI 响应完成。',
    errorMessage: 'AI 润色失败，请检查网络后重试。',
  })

  if (result.status !== 'success' || !result.ticket || !isViewMounted.value) return

  const applied = applyWeeklyPolishResponse(result.payload)
  if (applied) {
    aiPendingRegistry.markConsumed(AI_PENDING_BOARDS.WEEKLY_REVIEW_POLISH, result.ticket.requestId)
  }
}

onMounted(async () => {
  isViewMounted.value = true
  void loadCollaborationContext()
  await loadReviewData()
})

watch(
  [
    () => collaborationStore.teamsLoadState.status,
    () => collaborationStore.teams.map((team) => team.id).join(','),
    () => reviewForm.value.visibilityScope,
    () => reviewForm.value.teamId,
  ],
  ([status]) => {
    if (
      status !== 'ready'
      || reviewForm.value.visibilityScope !== 'TEAM'
      || !reviewForm.value.teamId
      || collaborationStore.getTeam(reviewForm.value.teamId)
    ) return

    reviewForm.value = invalidateWeeklyReviewTargetTeam(reviewForm.value)
    resetAssociationContext()
    formIssues.value = [{ field: 'teamId', code: 'TEAM_REQUIRED' }]
    toast.error('原共享团队已不可用，请重新选择团队或改为仅自己可见。')
  },
)

watch(
  reviewAssociations.accessSignal,
  (signal) => {
    if (!signal) return
    if (
      signal.kind === 'PROJECT_ACCESS_LOST'
      && reviewForm.value.visibilityScope === 'TEAM'
      && reviewForm.value.teamId
      && !collaborationStore.getTeam(reviewForm.value.teamId)
    ) {
      reviewForm.value = invalidateWeeklyReviewTargetTeam(reviewForm.value)
      resetAssociationContext()
      formIssues.value = [{ field: 'teamId', code: 'TEAM_REQUIRED' }]
      toast.error('当前团队已不可用，请重新选择团队或改为仅自己可见。')
      return
    }

    associationAccessMessage.value = signal.kind === 'PROJECT_ACCESS_LOST'
      ? '关联项目权限已变化，请重试加载或重新打开本复盘。'
      : '部分任务权限已变化，请重试加载；已保存关联以后端最新详情为准。'
  },
)

watch(
  () => weeklyPolishEntry.value.status,
  (status) => {
    if (status === 'success' && isViewMounted.value) {
      consumePendingWeeklyPolish()
    }
  },
)

onBeforeUnmount(() => {
  isViewMounted.value = false
  reviewAssociations.resetContext()
})
</script>
