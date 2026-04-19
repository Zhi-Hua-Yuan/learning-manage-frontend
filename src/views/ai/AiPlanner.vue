<template>
  <main class="relative flex flex-1 flex-col overflow-y-auto bg-[var(--color-bg-page)] p-4 sm:p-6 lg:p-8">
    <div class="mx-auto w-full max-w-4xl space-y-6 sm:space-y-8">
      <div class="mb-6 space-y-2 text-center sm:mb-8">
        <h2 class="text-2xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
          让
          <span class="text-[var(--color-ai)]">AI</span>
          帮你拆解目标
        </h2>
        <p class="text-[var(--color-text-secondary)]">只需一句话，自动生成包含阶段与任务的落地执行计划</p>
      </div>

      <div
        class="card-base relative space-y-6 overflow-hidden rounded-2xl bg-[var(--color-bg-surface)] p-5 sm:p-8"
      >
        <div class="absolute top-0 left-0 h-1 w-full bg-[var(--color-ai)]"></div>

        <div class="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
          <div class="md:col-span-2">
            <label class="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--color-text-body)]">
              <AppIcon name="target" class="h-4 w-4" />
              你的目标是什么？
            </label>
            <input
              v-model="aiForm.target"
              :disabled="isGeneratingPlan"
              type="text"
              placeholder="例如：三个月内通过英语六级 / 独立开发一款小程序"
              class="focus-ring w-full rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 py-3 text-sm text-[var(--color-text-body)]"
            />
          </div>
          <div>
            <label class="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--color-text-body)]">
              <AppIcon name="history" class="h-4 w-4" />
              期望周期
            </label>
            <input
              v-model="aiForm.duration"
              :disabled="isGeneratingPlan"
              type="text"
              placeholder="例如：12周 / 1个月"
              class="focus-ring w-full rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 py-3 text-sm text-[var(--color-text-body)]"
            />
          </div>
          <div class="md:col-span-2">
            <label class="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--color-text-body)]">
              <AppIcon name="document" class="h-4 w-4" />
              补充描述 (可选)
            </label>
            <textarea
              v-model="aiForm.description"
              :disabled="isGeneratingPlan"
              placeholder="例如：我目前的基础比较薄弱，希望前两周以背单词和基础语法为主..."
              class="focus-ring min-h-[80px] w-full resize-none rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] p-4 text-sm text-[var(--color-text-body)]"
            ></textarea>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-3 pt-4">
          <button
            @click="generatePlan"
            :disabled="isGeneratingPlan"
            class="btn-ai flex items-center gap-2 rounded-full px-8 py-3 font-bold"
            :class="isGeneratingPlan ? 'cursor-not-allowed opacity-70' : ''"
          >
            <svg
              v-if="isGeneratingPlan"
              class="h-5 w-5 animate-spin text-[var(--color-text-on-accent)]"
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
            <AppIcon v-else name="sparkles" class="h-5 w-5" />
            {{ isGeneratingPlan ? 'AI 正在生成计划...' : '开始智能拆解' }}
          </button>

          <button
            type="button"
            class="btn-secondary rounded-full px-5 py-3 text-sm font-bold"
            :disabled="isGeneratingPlan || isApplying || isRetryingFailed"
            :class="
              isGeneratingPlan || isApplying || isRetryingFailed ? 'cursor-not-allowed opacity-70' : ''
            "
            @click="clearPlannerContent"
          >
            一键清空内容
          </button>
        </div>
      </div>

      <div
        v-if="generatedPlan.length > 0"
        class="card-base animate-fade-in-up space-y-6 rounded-2xl bg-[var(--color-bg-surface)] p-5 sm:p-8"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h3 class="flex items-center gap-2 text-xl font-bold text-[var(--color-text-primary)]">
            <AppIcon name="clipboard" class="h-5 w-5" />
            生成的专属计划草稿
          </h3>
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="btn-secondary rounded-lg px-3 py-2 text-xs font-bold"
              @click="selectAllDraftTasks"
            >
              全选
            </button>
            <button
              type="button"
              class="btn-secondary rounded-lg px-3 py-2 text-xs font-bold"
              @click="clearDraftTasks"
            >
              清空
            </button>
            <button
              @click="openConfirmModal"
              :disabled="isApplying || selectedTaskCount === 0"
              class="btn-ai flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-bold"
              :class="isApplying || selectedTaskCount === 0 ? 'cursor-not-allowed opacity-70' : ''"
            >
              <span v-if="isApplying">导入中...</span>
              <span v-else class="flex items-center gap-1.5">
                <AppIcon name="success" class="h-4 w-4" />
                勾选项导入系统
              </span>
            </button>
          </div>
        </div>

        <div class="rounded-xl border border-[var(--color-input-border)] bg-[var(--color-bg-elevated)] p-3 text-sm text-[var(--color-text-secondary)]">
          已选 {{ selectedMilestoneCount }} 个阶段，{{ selectedTaskCount }} / {{ totalTaskCount }} 个任务
        </div>

        <div class="space-y-6">
          <div
            v-for="(milestone, mIndex) in generatedPlan"
            :key="`milestone-${mIndex}`"
            class="rounded-xl border border-[var(--color-success)]/35 bg-[var(--color-success-soft)]/35 p-5"
          >
            <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
              <label class="flex cursor-pointer items-center gap-3 text-[var(--color-ai)]">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-[var(--color-input-border)] text-[var(--color-ai)] focus:ring-[var(--color-input-ring)]"
                  :checked="isMilestoneChecked(mIndex)"
                  :indeterminate.prop="isMilestoneIndeterminate(mIndex)"
                  @change="toggleMilestoneSelection(mIndex, $event)"
                />
                <span class="flex items-center gap-2 font-bold">
                  <span
                    class="inline-flex h-6 min-w-[56px] items-center justify-center whitespace-nowrap rounded bg-[var(--color-success)]/20 px-2 text-xs text-[var(--color-ai)]"
                    >阶段 {{ mIndex + 1 }}</span
                  >
                  {{ milestone.name }}
                </span>
              </label>
              <span class="text-xs text-[var(--color-ai)]">
                已选 {{ getSelectedTaskCountByMilestone(mIndex) }} / {{ milestone.tasks.length }} 任务
              </span>
            </div>

            <div class="space-y-2 pl-2 sm:pl-8">
              <label
                v-for="(task, tIndex) in milestone.tasks"
                :key="`task-${mIndex}-${tIndex}`"
                class="flex cursor-pointer items-start gap-3 rounded-lg border bg-[var(--color-bg-surface-muted)] p-3 text-sm text-[var(--color-text-body)]"
                :style="{ borderColor: getDraftTaskItemBorderColor(task.priority) }"
              >
                <input
                  type="checkbox"
                  class="mt-0.5 h-4 w-4 rounded border-[var(--color-input-border)] text-[var(--color-ai)] focus:ring-[var(--color-input-ring)]"
                  :checked="isTaskChecked(mIndex, tIndex)"
                  @change="toggleTaskSelection(mIndex, tIndex, $event)"
                />
                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0 flex-1 break-words font-medium">{{ getTaskTitle(task) }}</div>
                    <span
                      v-if="formatDraftTaskDueDate(task.dueDate)"
                      class="mono shrink-0 text-right text-xs text-[var(--color-text-secondary)]"
                    >
                      {{ formatDraftTaskDueDate(task.dueDate) }}
                    </span>
                  </div>
                  <div v-if="task.description" class="mt-1 text-xs text-[var(--color-text-secondary)]">
                    {{ task.description }}
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="failedImportItems.length > 0"
        class="card-base space-y-4 rounded-2xl border-[var(--color-warning)]/45 bg-[var(--color-warning-soft)]/45 p-5 sm:p-6"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="flex items-center gap-2 text-lg font-bold text-[var(--color-warning)]">
            <AppIcon name="warning" class="h-5 w-5" />
            导入存在失败项（{{ failedImportItems.length }}）
          </h3>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="btn-secondary rounded-lg px-3 py-2 text-xs font-bold"
              @click="goToImportedProject"
            >
              查看已导入任务
            </button>
            <button
              type="button"
              class="btn-primary rounded-lg px-3 py-2 text-xs font-bold"
              :disabled="isRetryingFailed"
              :class="isRetryingFailed ? 'cursor-not-allowed opacity-70' : ''"
              @click="retryFailedItems"
            >
              {{ isRetryingFailed ? '重试中...' : '重试失败项' }}
            </button>
          </div>
        </div>

        <div class="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-[var(--color-warning)]/45 bg-[var(--color-bg-elevated)] p-3">
          <div
            v-for="(item, index) in failedImportItems"
            :key="`failed-${index}`"
            class="rounded-lg border border-[var(--color-warning)]/35 bg-[var(--color-warning-soft)]/35 p-3"
          >
            <div class="text-sm font-semibold text-[var(--color-warning)]">{{ getFailureTitle(item) }}</div>
            <div class="mt-1 text-xs text-[var(--color-text-secondary)]">{{ item.reason }}</div>
          </div>
        </div>
      </div>
    </div>

    <transition
      enter-active-class="ease-out duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showConfirmModal"
        class="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none"
      >
        <div
          class="fixed inset-0 bg-[var(--color-backdrop-strong)] backdrop-blur-sm transition-opacity"
          @click="showConfirmModal = false"
        ></div>

        <div class="relative z-[var(--z-modal-panel)] mx-auto my-6 w-[calc(100%-2rem)] max-w-md transform transition-all">
          <div
            class="surface-panel relative flex w-full flex-col overflow-hidden rounded-2xl outline-none focus:outline-none"
          >
            <div class="h-1 w-full bg-[var(--color-ai)]"></div>
            <div class="flex flex-col items-center p-6 pb-0 text-center">
              <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-success-soft)]">
                <AppIcon name="sparkles" class="h-7 w-7 text-[var(--color-ai)]" />
              </div>
              <h3 class="mb-2 text-xl font-black text-[var(--color-text-primary)]">确认导入计划？</h3>
              <div class="space-y-2 px-4 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                <p>
                  将创建项目
                  <span class="font-bold text-[var(--color-ai)]">“{{ projectDisplayName }}”</span>
                </p>
                <p>已选阶段：{{ selectedMilestoneCount }} 个</p>
                <p>已选任务：{{ selectedTaskCount }} 个</p>
              </div>
            </div>
            <div class="flex items-center justify-center gap-3 rounded-b p-6">
              <button
                class="btn-secondary px-6 py-2.5 text-sm font-bold outline-none focus:outline-none"
                type="button"
                @click="showConfirmModal = false"
              >
                取消
              </button>
              <button
                class="btn-ai flex items-center gap-2 px-6 py-2.5 text-sm font-bold outline-none focus:outline-none"
                type="button"
                :disabled="isApplying"
                :class="isApplying ? 'cursor-not-allowed opacity-70' : ''"
                @click="executeImport"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
                {{ isApplying ? '导入中...' : '立即导入' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { aiBreakdownApi } from '@/api/ai'
import { addMilestoneApi } from '@/api/milestone'
import { addProjectApi, fetchProjectList } from '@/api/project'
import { addTaskApi } from '@/api/task'
import { useAiPendingRequest } from '@/composables/useAiPendingRequest'
import { AI_PENDING_BOARDS, useAiPendingRegistryStore } from '@/stores/aiPendingRegistry'
import { useToast } from '@/composables/useToast'
import { clearAiPlannerDraftCache, readAiPlannerDraftCache, writeAiPlannerDraftCache } from '@/utils/appCache'

const emit = defineEmits(['refresh-projects'])

interface DraftTask {
  title?: string
  name?: string
  description?: string
  priority?: number
  dueDate?: string
}

interface DraftMilestone {
  name: string
  tasks: DraftTask[]
}

interface SelectedMilestone extends DraftMilestone {
  orderNo: number
}

interface FailedMilestoneImport {
  kind: 'milestone'
  milestoneName: string
  orderNo: number
  tasks: DraftTask[]
  reason: string
}

interface FailedTaskImport {
  kind: 'task'
  milestoneName: string
  milestoneId: string
  task: DraftTask
  reason: string
}

type FailedImportItem = FailedMilestoneImport | FailedTaskImport

interface PersistedPlannerDraft {
  aiForm: {
    target: string
    description: string
    duration: string
  }
  generatedPlan: DraftMilestone[]
  selectedTaskMap: Record<string, boolean>
}

const router = useRouter()
const toast = useToast()
const aiPendingRegistry = useAiPendingRegistryStore()
const { runAiRequest } = useAiPendingRequest()
const TASK_TITLE_MAX_LENGTH = 50

const aiForm = ref({ target: '', description: '', duration: '' })
const isViewMounted = ref(false)
const generatedPlan = ref<DraftMilestone[]>([])
const selectedTaskMap = ref<Record<string, boolean>>({})
const isApplying = ref(false)
const isRetryingFailed = ref(false)
const showConfirmModal = ref(false)
const failedImportItems = ref<FailedImportItem[]>([])
const importProjectId = ref('')
const isDraftPersistencePaused = ref(false)
let persistDraftTimer: ReturnType<typeof setTimeout> | null = null

const plannerBreakdownEntry = computed(
  () => aiPendingRegistry.boards[AI_PENDING_BOARDS.AI_PLANNER_BREAKDOWN],
)
const isGeneratingPlan = computed(() => plannerBreakdownEntry.value.status === 'pending')

const getTaskKey = (mIndex: number, tIndex: number) => `${mIndex}-${tIndex}`

const getTaskTitle = (task: DraftTask) => {
  const title = (task.title || task.name || '').trim()
  return title || '未命名任务'
}

const taskItemPriorityBorderColorMap: Record<number, string> = {
  3: 'var(--color-danger)',
  2: 'var(--color-warning)',
  1: 'var(--color-success)',
  0: 'var(--color-input-border)',
}

const getDraftTaskItemBorderColor = (priority?: number) => {
  const normalizedPriority =
    typeof priority === 'number' && Number.isFinite(priority) ? Math.max(0, Math.min(3, priority)) : 0
  return taskItemPriorityBorderColorMap[normalizedPriority] || taskItemPriorityBorderColorMap[0]
}

const normalizeDraftTaskDueDate = (dueDate?: string | null) => {
  if (!dueDate) return ''
  const normalized = dueDate.includes('T') ? dueDate.slice(0, 10) : dueDate
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : ''
}

const formatDraftTaskDueDate = (dueDate?: string | null) => normalizeDraftTaskDueDate(dueDate)

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message || '请求失败')
    return message.replace(/不能超过\s*60\s*字符/g, '不能超过 50 字符')
  }
  return '请求失败'
}

const resolveEntityId = (entity: unknown) => {
  if (entity && typeof entity === 'object' && 'id' in (entity as { id?: unknown })) {
    const id = (entity as { id?: unknown }).id
    if (id !== undefined && id !== null) {
      const parsed = String(id)
      if (parsed && parsed !== 'true') return parsed
    }
  }

  if (typeof entity === 'string' || typeof entity === 'number') {
    const parsed = String(entity)
    if (parsed && parsed !== 'true') return parsed
  }

  return ''
}

const normalizePlan = (raw: unknown): DraftMilestone[] => {
  if (!Array.isArray(raw)) return []

  return raw.map((item, index) => {
    const source = item as { name?: unknown; tasks?: unknown }
    const name = typeof source.name === 'string' && source.name.trim() ? source.name.trim() : `阶段 ${index + 1}`
    const tasks = Array.isArray(source.tasks)
      ? source.tasks.map((task) => {
          const sourceTask = task as {
            title?: unknown
            name?: unknown
            description?: unknown
            priority?: unknown
            dueDate?: unknown
          }
          const dueDate =
            typeof sourceTask.dueDate === 'string' && sourceTask.dueDate.trim()
              ? sourceTask.dueDate.trim()
              : undefined
          return {
            title: typeof sourceTask.title === 'string' ? sourceTask.title : undefined,
            name: typeof sourceTask.name === 'string' ? sourceTask.name : undefined,
            description: typeof sourceTask.description === 'string' ? sourceTask.description : undefined,
            priority:
              typeof sourceTask.priority === 'number' && Number.isFinite(sourceTask.priority)
                ? sourceTask.priority
                : undefined,
            dueDate,
          } satisfies DraftTask
        })
      : []

    return { name, tasks } satisfies DraftMilestone
  })
}

const pauseDraftPersistenceOnce = () => {
  if (typeof window === 'undefined') return
  isDraftPersistencePaused.value = true
  window.setTimeout(() => {
    isDraftPersistencePaused.value = false
  }, 0)
}

const clearPersistedDraft = () => {
  if (typeof window === 'undefined') return
  clearAiPlannerDraftCache()
}

const persistPlannerDraft = () => {
  if (typeof window === 'undefined') return

  const hasFormContent =
    aiForm.value.target.trim() !== '' || aiForm.value.duration.trim() !== '' || aiForm.value.description.trim() !== ''
  if (!hasFormContent && generatedPlan.value.length === 0) {
    clearPersistedDraft()
    return
  }

  const payload: PersistedPlannerDraft = {
    aiForm: { ...aiForm.value },
    generatedPlan: generatedPlan.value,
    selectedTaskMap: selectedTaskMap.value,
  }

  writeAiPlannerDraftCache(payload)
}

const schedulePersistPlannerDraft = () => {
  if (typeof window === 'undefined') return

  if (persistDraftTimer) {
    window.clearTimeout(persistDraftTimer)
  }

  persistDraftTimer = window.setTimeout(() => {
    persistPlannerDraft()
    persistDraftTimer = null
  }, 120)
}

const flushPersistPlannerDraft = () => {
  if (typeof window === 'undefined') return
  if (persistDraftTimer) {
    window.clearTimeout(persistDraftTimer)
    persistDraftTimer = null
  }
  persistPlannerDraft()
}

const hydrateDraftFromStorage = () => {
  if (typeof window === 'undefined') return

  const parsed = readAiPlannerDraftCache<Partial<PersistedPlannerDraft>>()
  if (!parsed) return

  try {
    const nextForm = {
      target: typeof parsed.aiForm?.target === 'string' ? parsed.aiForm.target : '',
      description: typeof parsed.aiForm?.description === 'string' ? parsed.aiForm.description : '',
      duration: typeof parsed.aiForm?.duration === 'string' ? parsed.aiForm.duration : '',
    }

    const nextPlan = normalizePlan(parsed.generatedPlan)
    const rawMap =
      parsed.selectedTaskMap && typeof parsed.selectedTaskMap === 'object' ? parsed.selectedTaskMap : {}

    const nextMap: Record<string, boolean> = {}
    nextPlan.forEach((milestone, mIndex) => {
      milestone.tasks.forEach((_task, tIndex) => {
        const taskKey = getTaskKey(mIndex, tIndex)
        const rawValue = (rawMap as Record<string, unknown>)[taskKey]
        nextMap[taskKey] = typeof rawValue === 'boolean' ? rawValue : true
      })
    })

    pauseDraftPersistenceOnce()
    aiForm.value = nextForm
    generatedPlan.value = nextPlan
    selectedTaskMap.value = nextMap
  } catch {
    clearPersistedDraft()
  }
}

const initializeSelection = (plan: DraftMilestone[]) => {
  const nextMap: Record<string, boolean> = {}
  plan.forEach((milestone, mIndex) => {
    milestone.tasks.forEach((_task, tIndex) => {
      nextMap[getTaskKey(mIndex, tIndex)] = true
    })
  })
  selectedTaskMap.value = nextMap
}

const selectedMilestones = computed<SelectedMilestone[]>(() =>
  generatedPlan.value
    .map((milestone, mIndex) => ({
      ...milestone,
      orderNo: mIndex,
      tasks: milestone.tasks.filter((_task, tIndex) => selectedTaskMap.value[getTaskKey(mIndex, tIndex)]),
    }))
    .filter((item) => item.tasks.length > 0),
)

const selectedTaskCount = computed(() =>
  selectedMilestones.value.reduce((sum, milestone) => sum + milestone.tasks.length, 0),
)
const totalTaskCount = computed(() =>
  generatedPlan.value.reduce((sum, milestone) => sum + milestone.tasks.length, 0),
)
const selectedMilestoneCount = computed(() => selectedMilestones.value.length)

const projectDisplayName = computed(() => {
  const target = aiForm.value.target.trim() || '未命名目标'
  return `[AI] ${target}`
})

const isTaskChecked = (mIndex: number, tIndex: number) =>
  Boolean(selectedTaskMap.value[getTaskKey(mIndex, tIndex)])

const getSelectedTaskCountByMilestone = (mIndex: number) =>
  generatedPlan.value[mIndex]?.tasks.filter((_task, tIndex) => isTaskChecked(mIndex, tIndex)).length || 0

const isMilestoneChecked = (mIndex: number) => {
  const milestone = generatedPlan.value[mIndex]
  if (!milestone || milestone.tasks.length === 0) return false
  return milestone.tasks.every((_task, tIndex) => isTaskChecked(mIndex, tIndex))
}

const isMilestoneIndeterminate = (mIndex: number) => {
  const milestone = generatedPlan.value[mIndex]
  if (!milestone || milestone.tasks.length === 0) return false
  const selectedCount = getSelectedTaskCountByMilestone(mIndex)
  return selectedCount > 0 && selectedCount < milestone.tasks.length
}

const toggleTaskSelection = (mIndex: number, tIndex: number, event: Event) => {
  const checked = (event.target as HTMLInputElement).checked
  selectedTaskMap.value = {
    ...selectedTaskMap.value,
    [getTaskKey(mIndex, tIndex)]: checked,
  }
}

const toggleMilestoneSelection = (mIndex: number, event: Event) => {
  const checked = (event.target as HTMLInputElement).checked
  const nextMap = { ...selectedTaskMap.value }
  const milestone = generatedPlan.value[mIndex]
  if (!milestone) return
  milestone.tasks.forEach((_task, tIndex) => {
    nextMap[getTaskKey(mIndex, tIndex)] = checked
  })
  selectedTaskMap.value = nextMap
}

const selectAllDraftTasks = () => {
  const nextMap: Record<string, boolean> = {}
  generatedPlan.value.forEach((milestone, mIndex) => {
    milestone.tasks.forEach((_task, tIndex) => {
      nextMap[getTaskKey(mIndex, tIndex)] = true
    })
  })
  selectedTaskMap.value = nextMap
}

const clearDraftTasks = () => {
  const nextMap: Record<string, boolean> = {}
  generatedPlan.value.forEach((milestone, mIndex) => {
    milestone.tasks.forEach((_task, tIndex) => {
      nextMap[getTaskKey(mIndex, tIndex)] = false
    })
  })
  selectedTaskMap.value = nextMap
}

const applyGeneratedPlan = (payload: unknown) => {
  const normalized = normalizePlan(payload)
  generatedPlan.value = normalized
  initializeSelection(normalized)

  if (normalized.length === 0) {
    toast.warning('AI 未生成有效草稿，请补充描述后重试。')
  }
  return true
}

const consumePendingGeneratedPlan = () => {
  const entry = plannerBreakdownEntry.value
  if (entry.status !== 'success') return

  const applied = applyGeneratedPlan(entry.responsePayload)
  if (applied) {
    aiPendingRegistry.markConsumed(AI_PENDING_BOARDS.AI_PLANNER_BREAKDOWN, entry.requestId)
  }
}

const generatePlan = async () => {
  if (!aiForm.value.target.trim() || !aiForm.value.duration.trim()) {
    toast.error('请先填写目标和期望周期。')
    return
  }

  const result = await runAiRequest({
    board: AI_PENDING_BOARDS.AI_PLANNER_BREAKDOWN,
    requestMeta: {
      target: aiForm.value.target.trim(),
      duration: aiForm.value.duration.trim(),
      hasDescription: Boolean(aiForm.value.description?.trim()),
    },
    onStart: () => {
      generatedPlan.value = []
      selectedTaskMap.value = {}
      failedImportItems.value = []
      importProjectId.value = ''
    },
    request: () => aiBreakdownApi(aiForm.value),
    successMessage: 'AI 智能规划响应完成。',
    errorMessage: 'AI 拆解失败，请检查网络后重试。',
  })

  if (result.status !== 'success' || !result.ticket || !isViewMounted.value) return

  const applied = applyGeneratedPlan(result.payload)
  if (applied) {
    aiPendingRegistry.markConsumed(AI_PENDING_BOARDS.AI_PLANNER_BREAKDOWN, result.ticket.requestId)
  }
}

const openConfirmModal = () => {
  if (generatedPlan.value.length === 0) return
  if (selectedTaskCount.value === 0) {
    toast.warning('请至少勾选一个任务后再导入。')
    return
  }
  showConfirmModal.value = true
}

const createTask = async (projectId: string, milestoneId: string, task: DraftTask) => {
  const finalTitle = getTaskTitle(task).slice(0, TASK_TITLE_MAX_LENGTH)
  const normalizedPriority =
    typeof task.priority === 'number' && Number.isFinite(task.priority) ? task.priority : 0
  const normalizedDueDate = typeof task.dueDate === 'string' && task.dueDate.trim() ? task.dueDate.trim() : undefined
  await addTaskApi({
    title: finalTitle,
    description: task.description || '',
    projectId,
    priority: normalizedPriority,
    dueDate: normalizedDueDate,
    milestoneId: milestoneId || undefined,
  })
}

const ensureProjectId = async () => {
  const created = await addProjectApi({ name: projectDisplayName.value, icon: 'sparkles' })
  const directId = resolveEntityId(created)
  if (directId) return directId

  const listRes = await fetchProjectList()
  const records = (listRes as { records?: Array<{ id: string | number; name: string }> })?.records || []
  const matched = [...records].reverse().find((item) => item.name === projectDisplayName.value)
  if (matched?.id !== undefined && matched?.id !== null) {
    return String(matched.id)
  }

  throw new Error('创建项目后未返回可用的项目 ID')
}

const runImport = async (milestones: SelectedMilestone[], projectId: string) => {
  const failures: FailedImportItem[] = []

  for (const milestone of milestones) {
    let milestoneId = ''

    try {
      const createdMilestone = await addMilestoneApi({
        name: milestone.name,
        projectId,
        orderNo: milestone.orderNo,
      })
      milestoneId = resolveEntityId(createdMilestone)
      if (!milestoneId) {
        throw new Error('创建阶段后未返回阶段 ID')
      }
    } catch (error) {
      failures.push({
        kind: 'milestone',
        milestoneName: milestone.name,
        orderNo: milestone.orderNo,
        tasks: milestone.tasks,
        reason: getErrorMessage(error),
      })
      continue
    }

    for (const task of milestone.tasks) {
      try {
        await createTask(projectId, milestoneId, task)
      } catch (error) {
        failures.push({
          kind: 'task',
          milestoneName: milestone.name,
          milestoneId,
          task,
          reason: getErrorMessage(error),
        })
      }
    }
  }

  return failures
}

const resetPlannerState = () => {
  if (persistDraftTimer && typeof window !== 'undefined') {
    window.clearTimeout(persistDraftTimer)
    persistDraftTimer = null
  }
  pauseDraftPersistenceOnce()
  aiForm.value = { target: '', description: '', duration: '' }
  generatedPlan.value = []
  selectedTaskMap.value = {}
  failedImportItems.value = []
  importProjectId.value = ''
  clearPersistedDraft()
}

const clearPlannerContent = () => {
  showConfirmModal.value = false
  resetPlannerState()
  toast.success('已清空当前内容。')
}

const executeImport = async () => {
  showConfirmModal.value = false
  if (selectedTaskCount.value === 0) {
    toast.warning('请至少勾选一个任务后再导入。')
    return
  }

  isApplying.value = true
  failedImportItems.value = []

  try {
    const projectId = await ensureProjectId()
    importProjectId.value = projectId

    const failures = await runImport(selectedMilestones.value, projectId)
    failedImportItems.value = failures
    emit('refresh-projects')

    if (failures.length === 0) {
      toast.success('AI 计划已导入系统。')
      resetPlannerState()
      await router.push({ path: '/tasks', query: { projectId } })
      return
    }

    toast.warning(`导入完成，但有 ${failures.length} 项失败。可点击“重试失败项”。`, 5000)
  } catch (error) {
    console.error('导入失败', error)
    toast.error('导入失败，请检查网络后重试。')
  } finally {
    isApplying.value = false
  }
}

const retryFailedItems = async () => {
  if (isRetryingFailed.value || !importProjectId.value || failedImportItems.value.length === 0) return

  isRetryingFailed.value = true
  try {
    const nextFailures: FailedImportItem[] = []
    const projectId = importProjectId.value

    for (const item of failedImportItems.value) {
      if (item.kind === 'milestone') {
        try {
          const createdMilestone = await addMilestoneApi({
            name: item.milestoneName,
            projectId,
            orderNo: item.orderNo,
          })
          const milestoneId = resolveEntityId(createdMilestone)
          if (!milestoneId) {
            throw new Error('创建阶段后未返回阶段 ID')
          }

          for (const task of item.tasks) {
            try {
              await createTask(projectId, milestoneId, task)
            } catch (error) {
              nextFailures.push({
                kind: 'task',
                milestoneName: item.milestoneName,
                milestoneId,
                task,
                reason: getErrorMessage(error),
              })
            }
          }
        } catch (error) {
          nextFailures.push({
            ...item,
            reason: getErrorMessage(error),
          })
        }
      } else {
        try {
          await createTask(projectId, item.milestoneId, item.task)
        } catch (error) {
          nextFailures.push({
            ...item,
            reason: getErrorMessage(error),
          })
        }
      }
    }

    failedImportItems.value = nextFailures

    if (nextFailures.length === 0) {
      toast.success('失败项已全部重试成功。')
      emit('refresh-projects')
      resetPlannerState()
      await router.push({ path: '/tasks', query: { projectId } })
      return
    }

    toast.warning(`仍有 ${nextFailures.length} 项失败，请稍后重试。`, 5000)
  } finally {
    isRetryingFailed.value = false
  }
}

const goToImportedProject = async () => {
  if (!importProjectId.value) {
    await router.push('/tasks')
    return
  }
  await router.push({ path: '/tasks', query: { projectId: importProjectId.value } })
}

watch(
  [aiForm, generatedPlan, selectedTaskMap],
  () => {
    if (isDraftPersistencePaused.value) return
    schedulePersistPlannerDraft()
  },
  { deep: true },
)

watch(
  () => plannerBreakdownEntry.value.status,
  (status) => {
    if (status === 'success' && isViewMounted.value) {
      consumePendingGeneratedPlan()
    }
  },
)

onMounted(() => {
  isViewMounted.value = true
  hydrateDraftFromStorage()
  if (generatedPlan.value.length === 0) {
    consumePendingGeneratedPlan()
  }
})

onBeforeUnmount(() => {
  isViewMounted.value = false
  flushPersistPlannerDraft()
})

const getFailureTitle = (item: FailedImportItem) => {
  if (item.kind === 'milestone') {
    return `阶段导入失败：${item.milestoneName}`
  }
  return `任务导入失败：${getTaskTitle(item.task)}（阶段：${item.milestoneName}）`
}
</script>
