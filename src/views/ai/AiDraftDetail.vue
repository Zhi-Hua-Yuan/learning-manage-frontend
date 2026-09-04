<template>
  <main class="flex flex-1 flex-col overflow-y-auto bg-[var(--color-bg-page)] p-4 sm:p-6 lg:p-8">
    <div class="mx-auto w-full max-w-5xl space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-[var(--color-ai)]">AI 任务拆解</p>
          <h1 class="mt-1 text-2xl font-black text-[var(--color-text-primary)] sm:text-3xl">草稿详情与确认</h1>
        </div>
        <button type="button" class="btn-secondary rounded-lg px-4 py-2 text-sm font-semibold" @click="goBackToPlanner">
          返回智能规划
        </button>
      </div>

      <div v-if="isLoading" class="space-y-4" aria-live="polite">
        <div class="card-base space-y-4 bg-[var(--color-bg-surface)] p-5 sm:p-6">
          <div class="h-5 w-1/3 animate-pulse rounded bg-[var(--color-bg-surface-muted)]"></div>
          <div class="h-4 w-2/3 animate-pulse rounded bg-[var(--color-bg-surface-muted)]"></div>
          <div class="h-24 animate-pulse rounded-xl bg-[var(--color-bg-surface-muted)]"></div>
        </div>
      </div>

      <AiErrorNotice
        v-else-if="loadErrorPresentation"
        class="card-base"
        :title="loadErrorTitle"
        :presentation="loadErrorPresentation"
        @action="loadDraft"
      />

      <div
        v-else-if="validationError"
        class="card-base space-y-4 rounded-2xl border-[var(--color-warning)]/40 bg-[var(--color-warning-soft)]/45 p-6 text-center"
        role="alert"
      >
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-warning-soft)] text-[var(--color-warning)]">
          <AppIcon name="warning" class="h-6 w-6" />
        </div>
        <div>
          <h2 class="text-lg font-bold text-[var(--color-text-primary)]">草稿内容无法安全展示</h2>
          <p class="mt-2 text-sm text-[var(--color-text-secondary)]">{{ validationError }}</p>
          <p class="mt-1 text-xs text-[var(--color-text-tertiary)]">为避免创建错误数据，本草稿不能进入确认流程。</p>
        </div>
        <button type="button" class="btn-secondary rounded-lg px-4 py-2 text-sm font-semibold" @click="loadDraft">
          重新读取草稿
        </button>
      </div>

      <template v-else-if="draftDetail && draftPayload">
        <AiErrorNotice
          v-if="operationErrorPresentation"
          class="card-base"
          title="草稿操作未完成"
          :presentation="operationErrorPresentation"
          @action="handleDraftOperationErrorAction"
        />

        <section class="card-base relative overflow-hidden rounded-2xl bg-[var(--color-bg-surface)] p-5 sm:p-6">
          <div class="absolute top-0 left-0 h-1 w-full bg-[var(--color-ai)]"></div>
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full px-3 py-1 text-xs font-bold" :class="statusClass">{{ statusLabel }}</span>
                <span class="text-xs text-[var(--color-text-tertiary)]">草稿 ID：{{ draftDetail.draftId }}</span>
              </div>
              <h2 class="mt-4 break-words text-xl font-black text-[var(--color-text-primary)] sm:text-2xl">
                <SafeAiText :text="draftPayload.target" />
              </h2>
              <p class="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-secondary)]">
                <SafeAiText :text="draftPayload.description || '暂无补充描述'" />
              </p>
            </div>

            <div class="grid min-w-[220px] gap-2 text-sm sm:grid-cols-1">
              <div class="rounded-lg bg-[var(--color-bg-surface-muted)] px-3 py-2">
                <span class="text-[var(--color-text-tertiary)]">周期：</span>
                <span class="font-semibold text-[var(--color-text-body)]">{{ draftPayload.duration }}</span>
              </div>
              <div class="rounded-lg bg-[var(--color-bg-surface-muted)] px-3 py-2">
                <span class="text-[var(--color-text-tertiary)]">模式：</span>
                <span class="font-semibold text-[var(--color-text-body)]">{{ draftPayload.detailed ? '详细模式' : '普通模式' }}</span>
              </div>
            </div>
          </div>

          <div class="mt-5 grid gap-3 border-t border-[var(--color-divider-muted)] pt-4 text-sm sm:grid-cols-2">
            <div>
              <div class="text-xs text-[var(--color-text-tertiary)]">过期时间</div>
              <div class="mono mt-1 font-semibold text-[var(--color-text-body)]">{{ formatDateTime(draftDetail.expireAt) }}</div>
            </div>
            <div>
              <div class="text-xs text-[var(--color-text-tertiary)]">剩余时间</div>
              <div class="mono mt-1 font-semibold" :class="canOperate ? 'text-[var(--color-ai)]' : 'text-[var(--color-text-secondary)]'">
                {{ countdownLabel }}
              </div>
            </div>
          </div>
        </section>

        <section class="card-base space-y-5 rounded-2xl bg-[var(--color-bg-surface)] p-5 sm:p-6">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="flex items-center gap-2 text-xl font-bold text-[var(--color-text-primary)]">
              <AppIcon name="clipboard" class="h-5 w-5" />
              执行计划预览
            </h2>
            <span class="text-sm text-[var(--color-text-secondary)]">
              {{ draftPayload.milestones.length }} 个里程碑，{{ totalTaskCount }} 个任务
            </span>
          </div>

          <div class="space-y-5">
            <article
              v-for="(milestone, milestoneIndex) in draftPayload.milestones"
              :key="`${milestoneIndex}-${milestone.name}`"
              class="rounded-xl border border-[var(--color-success)]/35 bg-[var(--color-success-soft)]/35 p-4 sm:p-5"
            >
              <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 class="flex min-w-0 items-center gap-2 font-bold text-[var(--color-ai)]">
                  <span class="inline-flex h-6 min-w-[56px] items-center justify-center rounded bg-[var(--color-success)]/20 px-2 text-xs">
                    阶段 {{ milestoneIndex + 1 }}
                  </span>
                  <SafeAiText class="break-words" :text="milestone.name" />
                </h3>
                <span class="text-xs text-[var(--color-text-secondary)]">{{ milestone.tasks.length }} 个任务</span>
              </div>

              <div class="space-y-2 sm:pl-8">
                <div
                  v-for="(task, taskIndex) in milestone.tasks"
                  :key="`${taskIndex}-${task.name}`"
                  class="rounded-lg border bg-[var(--color-bg-surface-muted)] p-3 text-sm text-[var(--color-text-body)]"
                  :style="{ borderColor: getTaskBorderColor(task.priority) }"
                >
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <SafeAiText class="min-w-0 flex-1 break-words font-medium" :text="task.name" />
                    <div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      <span class="rounded-full px-2 py-1 text-xs font-semibold" :class="getPriorityClass(task.priority)">
                        {{ getPriorityLabel(task.priority) }}
                      </span>
                      <span class="mono text-xs text-[var(--color-text-secondary)]">{{ task.dueDate }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section class="card-base rounded-2xl bg-[var(--color-bg-surface)] p-5 sm:p-6">
          <div v-if="canOperate" class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 class="font-bold text-[var(--color-text-primary)]">确认后将创建完整计划</h2>
              <p class="mt-1 text-sm text-[var(--color-text-secondary)]">后端会创建上方全部里程碑和任务，确认后不可选择部分导入。</p>
            </div>
            <div class="flex gap-3">
              <button
                type="button"
                class="btn-secondary rounded-lg px-5 py-2.5 text-sm font-bold"
                :disabled="isMutating"
                :class="isMutating ? 'cursor-not-allowed opacity-70' : ''"
                @click="showCancelDialog = true"
              >
                取消草稿
              </button>
              <button
                type="button"
                class="btn-ai rounded-lg px-5 py-2.5 text-sm font-bold"
                :disabled="isMutating"
                :class="isMutating ? 'cursor-not-allowed opacity-70' : ''"
                @click="openConfirmDialog"
              >
                确认并创建项目
              </button>
            </div>
          </div>

          <div v-else class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="font-bold text-[var(--color-text-primary)]">{{ terminalStateTitle }}</h2>
              <p class="mt-1 text-sm text-[var(--color-text-secondary)]">{{ terminalStateMessage }}</p>
            </div>
            <button type="button" class="btn-secondary rounded-lg px-4 py-2 text-sm font-semibold" :disabled="isMutating" @click="loadDraft">
              刷新状态
            </button>
          </div>
        </section>
      </template>
    </div>

    <transition name="confirm-overlay">
      <div
        v-if="showConfirmDialog"
        class="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="确认 AI 草稿"
      >
        <div class="absolute inset-0 bg-[var(--color-backdrop-strong)] backdrop-blur-sm" @click="closeConfirmDialog"></div>
        <div class="surface-panel relative z-[var(--z-modal-panel)] w-full max-w-lg overflow-hidden rounded-2xl">
          <div class="h-1.5 w-full bg-[var(--color-ai)]"></div>
          <div class="space-y-5 p-5 sm:p-6">
            <div>
              <h2 class="text-xl font-black text-[var(--color-text-primary)]">确认并创建完整计划</h2>
              <p class="mt-1 text-sm text-[var(--color-text-secondary)]">项目名称和目标可以在提交前调整。</p>
            </div>

            <div class="space-y-2">
              <label class="text-sm font-semibold text-[var(--color-text-body)]">项目名称</label>
              <input
                v-model="confirmForm.projectName"
                type="text"
                class="input-base w-full px-3 py-2.5 text-sm"
                :disabled="isMutating"
                placeholder="可选，默认使用拆解目标"
              />
            </div>

            <div class="space-y-2">
              <label class="text-sm font-semibold text-[var(--color-text-body)]">项目目标</label>
              <textarea
                v-model="confirmForm.projectGoal"
                class="input-base min-h-[96px] w-full resize-none px-3 py-2.5 text-sm"
                :disabled="isMutating"
                placeholder="可选，默认使用补充描述"
              ></textarea>
            </div>

            <div class="flex justify-end gap-3">
              <button type="button" class="btn-secondary rounded-lg px-5 py-2.5 text-sm font-bold" :disabled="isMutating" @click="closeConfirmDialog">
                返回检查
              </button>
              <button
                type="button"
                class="btn-ai rounded-lg px-5 py-2.5 text-sm font-bold"
                :disabled="isMutating"
                :class="isMutating ? 'cursor-not-allowed opacity-70' : ''"
                @click="confirmDraft"
              >
                {{ isConfirming ? '确认中...' : '确认创建' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <AppConfirmDialog
      v-model="showCancelDialog"
      variant="danger"
      icon-name="warning"
      title="确认取消这份草稿？"
      message="取消后不能再确认此草稿，已生成的预览内容不会创建为项目。"
      confirm-text="确认取消"
      cancel-text="返回"
      :loading="isMutating"
      @confirm="cancelDraft"
    />
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppConfirmDialog from '@/components/AppConfirmDialog.vue'
import AppIcon from '@/components/AppIcon.vue'
import AiErrorNotice from '@/components/AiErrorNotice.vue'
import SafeAiText from '@/components/SafeAiText.vue'
import {
  aiBreakdownConfirmApi,
  cancelAiDraftApi,
  getAiDraftDetailApi,
  type AiBreakdownDraftPayload,
  type AiBreakdownMilestoneDraft,
  type AiBreakdownTaskDraft,
  type AiDraftDetailResponse,
  type AiDraftStatus,
} from '@/api/ai'
import { useToast } from '@/composables/useToast'
import { isApiRequestError } from '@/utils/request'
import { resolveAiErrorPresentation, type AiErrorPresentation } from '@/utils/aiErrorPresentation'
import { clearProjectListCache, clearProjectProgressCache } from '@/utils/projectCache'
import { emitProjectListUpdated } from '@/utils/projectEvents'
import { clearTaskCache } from '@/utils/taskCache'
import {
  readSessionOperationId,
  writeSessionOperationId,
} from '@/utils/sessionOperation'

const props = defineProps<{ draftId: string }>()

const router = useRouter()
const toast = useToast()

const draftDetail = ref<AiDraftDetailResponse | null>(null)
const draftPayload = ref<AiBreakdownDraftPayload | null>(null)
const isLoading = ref(true)
const loadErrorMessage = ref('')
const loadErrorPresentation = ref<AiErrorPresentation | null>(null)
const operationErrorPresentation = ref<AiErrorPresentation | null>(null)
const loadErrorCode = ref<number | null>(null)
const validationError = ref('')
const isConfirming = ref(false)
const isCancelling = ref(false)
const showConfirmDialog = ref(false)
const showCancelDialog = ref(false)
const nowTimestamp = ref(Date.now())
const initializedFormDraftId = ref('')
const confirmOperationId = ref('')
let countdownTimer: ReturnType<typeof setInterval> | null = null

const confirmForm = reactive({
  projectName: '',
  projectGoal: '',
})

const STATUS_LABELS: Record<AiDraftStatus, string> = {
  0: '预览中',
  1: '已确认',
  2: '已取消',
  3: '已过期',
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const normalizeTask = (value: unknown): AiBreakdownTaskDraft | null => {
  if (!isRecord(value)) return null
  const name = typeof value.name === 'string' ? value.name.trim() : ''
  const priority = Number(value.priority)
  const dueDate = typeof value.dueDate === 'string' ? value.dueDate.trim() : ''
  if (!name || !Number.isInteger(priority) || priority < 0 || priority > 3) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return null
  return { name, priority, dueDate }
}

const normalizeMilestone = (value: unknown): AiBreakdownMilestoneDraft | null => {
  if (!isRecord(value) || !Array.isArray(value.tasks)) return null
  const name = typeof value.name === 'string' ? value.name.trim() : ''
  if (!name) return null
  const tasks = value.tasks.map(normalizeTask)
  if (tasks.some((task) => task === null)) return null
  return { name, tasks: tasks as AiBreakdownTaskDraft[] }
}

const parseBreakdownPayload = (payloadJson: string): AiBreakdownDraftPayload | null => {
  let parsed: unknown
  try {
    parsed = JSON.parse(payloadJson) as unknown
  } catch {
    return null
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.milestones) || parsed.milestones.length === 0) return null

  const target = typeof parsed.target === 'string' ? parsed.target.trim() : ''
  const duration = typeof parsed.duration === 'string' ? parsed.duration.trim() : ''
  const description = typeof parsed.description === 'string' ? parsed.description : ''
  if (!target || !duration || typeof parsed.detailed !== 'boolean') return null

  const milestones = parsed.milestones.map(normalizeMilestone)
  if (milestones.some((milestone) => milestone === null)) return null

  return {
    target,
    description,
    duration,
    detailed: parsed.detailed,
    milestones: milestones as AiBreakdownMilestoneDraft[],
  }
}

const resolveRequestErrorMessage = (error: unknown, fallback: string) => {
  return resolveAiErrorPresentation(error, fallback).message
}

const resolveWriteSafePresentation = (error: unknown, fallback: string): AiErrorPresentation => {
  const presentation = resolveAiErrorPresentation(error, fallback)
  if (presentation.action === 'REFRESH_STATE') return presentation
  return { ...presentation, action: 'NONE', actionLabel: null }
}

const loadErrorTitle = computed(() => (loadErrorCode.value === 40400 ? '草稿不存在' : '草稿加载失败'))
const isMutating = computed(() => isConfirming.value || isCancelling.value)
const expireTimestamp = computed(() => {
  const timestamp = Date.parse(draftDetail.value?.expireAt || '')
  return Number.isFinite(timestamp) ? timestamp : 0
})
const remainingMilliseconds = computed(() => Math.max(0, expireTimestamp.value - nowTimestamp.value))
const canOperate = computed(
  () =>
    Boolean(draftDetail.value && draftPayload.value) &&
    draftDetail.value?.status === 0 &&
    expireTimestamp.value > nowTimestamp.value,
)
const totalTaskCount = computed(
  () => draftPayload.value?.milestones.reduce((sum, milestone) => sum + milestone.tasks.length, 0) || 0,
)
const statusLabel = computed(() => {
  const status = draftDetail.value?.status
  if (status === undefined) return '未知状态'
  return draftDetail.value?.statusText?.trim() || STATUS_LABELS[status]
})
const statusClass = computed(() => {
  switch (draftDetail.value?.status) {
    case 0:
      return 'bg-[var(--color-primary-soft)] text-[var(--color-ai)]'
    case 1:
      return 'bg-[var(--color-success-soft)] text-[var(--color-success)]'
    case 2:
      return 'bg-[var(--color-bg-surface-muted)] text-[var(--color-text-secondary)]'
    case 3:
      return 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]'
    default:
      return 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
  }
})
const countdownLabel = computed(() => {
  if (draftDetail.value?.status !== 0) return '不可操作'
  const remaining = remainingMilliseconds.value
  if (remaining <= 0) return '已到达过期时间'
  const totalSeconds = Math.floor(remaining / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return hours > 0 ? `${hours} 小时 ${minutes} 分 ${seconds} 秒` : `${minutes} 分 ${seconds} 秒`
})
const terminalStateTitle = computed(() => {
  if (draftDetail.value?.status === 1) return '该草稿已经确认'
  if (draftDetail.value?.status === 2) return '该草稿已经取消'
  if (draftDetail.value?.status === 3 || remainingMilliseconds.value <= 0) return '该草稿已经过期'
  return '当前草稿不可操作'
})
const terminalStateMessage = computed(() => {
  if (draftDetail.value?.status === 1) return '项目已经创建，可从左侧清单或任务页面继续查看。'
  if (draftDetail.value?.status === 2) return '服务端已记录取消状态，不能再次确认。'
  if (draftDetail.value?.status === 3) return '服务端已将草稿标记为过期。'
  if (remainingMilliseconds.value <= 0) return '展示倒计时已结束，请刷新以获取服务端最新状态。'
  return '请刷新页面获取服务端最新状态。'
})

const formatDateTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间格式异常'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

const getPriorityLabel = (priority: number) => ['无优先级', '低优先级', '中优先级', '高优先级'][priority] || '未知优先级'
const getPriorityClass = (priority: number) => {
  if (priority === 3) return 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
  if (priority === 2) return 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]'
  if (priority === 1) return 'bg-[var(--color-success-soft)] text-[var(--color-success)]'
  return 'bg-[var(--color-bg-surface-secondary)] text-[var(--color-text-secondary)]'
}
const getTaskBorderColor = (priority: number) => {
  if (priority === 3) return 'var(--color-danger)'
  if (priority === 2) return 'var(--color-warning)'
  if (priority === 1) return 'var(--color-success)'
  return 'var(--color-input-border)'
}

const loadDraft = async () => {
  const draftId = String(props.draftId || '').trim()
  if (!draftId) {
    isLoading.value = false
    loadErrorCode.value = 40400
    loadErrorMessage.value = '路由中缺少草稿 ID。'
    loadErrorPresentation.value = {
      message: loadErrorMessage.value,
      action: 'NONE',
      actionLabel: null,
      retryable: false,
      traceId: null,
    }
    return
  }

  isLoading.value = true
  loadErrorMessage.value = ''
  loadErrorPresentation.value = null
  loadErrorCode.value = null
  validationError.value = ''

  try {
    const detail = await getAiDraftDetailApi(draftId)
    draftDetail.value = detail
    draftPayload.value = null

    if (detail.draftId !== draftId) {
      validationError.value = '服务端返回的草稿 ID 与当前路由不一致。'
      return
    }
    if (detail.scene !== 'task-breakdown') {
      validationError.value = '该草稿不是任务拆解场景，无法在此页面确认。'
      return
    }
    if (![0, 1, 2, 3].includes(detail.status)) {
      validationError.value = '服务端返回了无法识别的草稿状态。'
      return
    }
    if (!Number.isFinite(Date.parse(detail.expireAt))) {
      validationError.value = '草稿过期时间格式异常。'
      return
    }

    const payload = parseBreakdownPayload(detail.payloadJson)
    if (!payload) {
      validationError.value = 'payloadJson 无法解析，或里程碑、任务字段不符合任务拆解结构。'
      return
    }

    draftPayload.value = payload
    if (initializedFormDraftId.value !== draftId) {
      confirmForm.projectName = payload.target
      confirmForm.projectGoal = payload.description || ''
      initializedFormDraftId.value = draftId
    }
  } catch (error) {
    draftDetail.value = null
    draftPayload.value = null
    loadErrorCode.value = isApiRequestError(error) ? error.code : null
    loadErrorMessage.value = resolveRequestErrorMessage(error, '草稿加载失败，请稍后重试。')
    loadErrorPresentation.value = resolveAiErrorPresentation(error, loadErrorMessage.value)
  } finally {
    isLoading.value = false
    nowTimestamp.value = Date.now()
  }
}

const readStoredOperationId = (draftId: string) => {
  return readSessionOperationId(draftId)
}

const createUuid = () => {
  try {
    if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID()
  } catch {
    // Continue with a UUID v4-compatible local fallback.
  }

  const bytes = new Uint8Array(16)
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`
}

const getOrCreateOperationId = () => {
  const draftId = String(props.draftId || '').trim()
  if (confirmOperationId.value) {
    // Actor bootstrap can lag behind draft hydration. Retry persistence on
    // every operation attempt so a pre-bootstrap in-memory id is durable once
    // the active actor becomes available.
    writeSessionOperationId(draftId, confirmOperationId.value)
    return confirmOperationId.value
  }

  const stored = readStoredOperationId(draftId)
  if (stored) {
    confirmOperationId.value = stored
    return stored
  }

  const operationId = createUuid()
  confirmOperationId.value = operationId
  writeSessionOperationId(draftId, operationId)
  return operationId
}

const openConfirmDialog = () => {
  if (!canOperate.value || isMutating.value) return
  showConfirmDialog.value = true
}

const closeConfirmDialog = () => {
  if (isMutating.value) return
  showConfirmDialog.value = false
}

const refreshCreatedProjectData = () => {
  clearProjectListCache(0)
  clearProjectProgressCache()
  clearTaskCache()
  emitProjectListUpdated('ai-draft-confirm')
}

const confirmDraft = async () => {
  if (!canOperate.value || isMutating.value || !draftDetail.value) return
  isConfirming.value = true
  operationErrorPresentation.value = null

  try {
    const result = await aiBreakdownConfirmApi({
      draftId: draftDetail.value.draftId,
      operationId: getOrCreateOperationId(),
      projectName: confirmForm.projectName.trim() || undefined,
      projectGoal: confirmForm.projectGoal.trim() || undefined,
    })

    showConfirmDialog.value = false
    if (!result.success) {
      toast.error('草稿确认未成功，正在刷新服务端状态。')
      await loadDraft()
      return
    }

    await loadDraft()
    refreshCreatedProjectData()
    toast.success(
      result.idempotentReplay
        ? '该草稿已经确认，已恢复创建结果。'
        : '计划已确认，项目和任务创建成功。',
    )
    await router.push({ path: '/tasks', query: { projectId: String(result.businessId) } })
  } catch (error) {
    showConfirmDialog.value = false
    operationErrorPresentation.value = resolveWriteSafePresentation(error, '确认草稿失败，请稍后重试。')
    toast.error(operationErrorPresentation.value.message, 5000)
    await loadDraft()
  } finally {
    isConfirming.value = false
  }
}

const cancelDraft = async () => {
  if (!canOperate.value || isMutating.value || !draftDetail.value) return
  isCancelling.value = true
  operationErrorPresentation.value = null

  try {
    const canceled = await cancelAiDraftApi({ draftId: draftDetail.value.draftId })
    showCancelDialog.value = false
    if (canceled) {
      toast.success('草稿已取消。')
    } else {
      toast.warning('草稿未能取消，正在刷新服务端状态。')
    }
    await loadDraft()
  } catch (error) {
    showCancelDialog.value = false
    operationErrorPresentation.value = resolveWriteSafePresentation(error, '取消草稿失败，请稍后重试。')
    toast.error(operationErrorPresentation.value.message, 5000)
    await loadDraft()
  } finally {
    isCancelling.value = false
  }
}

const handleDraftOperationErrorAction = () => {
  void loadDraft()
}

const goBackToPlanner = () => router.push('/ai-planner')

watch(
  () => props.draftId,
  () => {
    initializedFormDraftId.value = ''
    confirmOperationId.value = readStoredOperationId(String(props.draftId || '').trim())
    showConfirmDialog.value = false
    showCancelDialog.value = false
    void loadDraft()
  },
)

onMounted(() => {
  confirmOperationId.value = readStoredOperationId(String(props.draftId || '').trim())
  countdownTimer = setInterval(() => {
    nowTimestamp.value = Date.now()
  }, 1000)
  void loadDraft()
})

onBeforeUnmount(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>
