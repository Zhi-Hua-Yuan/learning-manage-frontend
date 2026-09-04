<template>
  <main class="relative flex flex-1 flex-col overflow-y-auto bg-[var(--color-bg-page)] p-4 sm:p-6 lg:p-8">
    <div class="mx-auto w-full max-w-4xl space-y-6 sm:space-y-8">
      <div class="mb-6 space-y-2 text-center sm:mb-8">
        <h2 class="text-2xl font-black tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
          让 <span class="text-[var(--color-ai)]">AI</span> 帮你拆解目标
        </h2>
        <p class="text-[var(--color-text-secondary)]">只需一句话，生成可确认的阶段与任务计划草稿</p>
      </div>

      <div class="card-base relative space-y-6 overflow-hidden rounded-2xl bg-[var(--color-bg-surface)] p-5 sm:p-8">
        <div class="absolute top-0 left-0 h-1 w-full bg-[var(--color-ai)]"></div>

        <div class="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
          <div class="md:col-span-2">
            <label class="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--color-text-body)]">
              <AppIcon name="target" class="h-4 w-4" />
              你的目标是什么？
            </label>
            <input
              ref="targetInput"
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

          <div class="flex items-end">
            <label
              class="flex w-full cursor-pointer items-center justify-between rounded-xl border border-[var(--color-input-border)] bg-[var(--color-bg-surface-muted)] px-4 py-3"
              :class="isGeneratingPlan ? 'cursor-not-allowed opacity-70' : ''"
            >
              <span>
                <span class="block text-sm font-bold text-[var(--color-text-body)]">详细拆解模式</span>
                <span class="mt-0.5 block text-xs text-[var(--color-text-secondary)]">生成更细致的执行步骤</span>
              </span>
              <input
                v-model="aiForm.detailed"
                :disabled="isGeneratingPlan"
                type="checkbox"
                class="h-4 w-4 rounded border-[var(--color-input-border)] text-[var(--color-ai)] focus:ring-[var(--color-input-ring)]"
              />
            </label>
          </div>

          <div class="md:col-span-2">
            <label class="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--color-text-body)]">
              <AppIcon name="document" class="h-4 w-4" />
              补充描述（可选）
            </label>
            <textarea
              v-model="aiForm.description"
              :disabled="isGeneratingPlan"
              placeholder="例如：我目前听力较弱，希望前两周先巩固词汇和基础听力..."
              class="focus-ring min-h-[96px] w-full resize-none rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] p-4 text-sm text-[var(--color-text-body)]"
            ></textarea>
          </div>
        </div>

        <div
          v-if="isGeneratingPlan"
          class="rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] px-4 py-3 text-sm text-[var(--color-text-secondary)]"
          aria-live="polite"
        >
          <div class="flex items-center gap-2">
            <svg class="h-4 w-4 animate-spin text-[var(--color-ai)]" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" />
              <path class="opacity-75" fill="currentColor" d="M21 12a9 9 0 0 0-9-9v3a6 6 0 0 1 6 6h3z" />
            </svg>
            <span>{{ isSlowGeneration ? 'AI 正在生成较复杂的计划，请耐心等待。' : 'AI 正在生成计划草稿，请稍候。' }}</span>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            class="btn-ai flex items-center gap-2 rounded-full px-8 py-3 font-bold"
            :disabled="isGeneratingPlan"
            :class="isGeneratingPlan ? 'cursor-not-allowed opacity-70' : ''"
            @click="generatePlan"
          >
            <AppIcon name="sparkles" class="h-5 w-5" />
            {{ isGeneratingPlan ? 'AI 正在生成计划...' : '开始智能拆解' }}
          </button>

          <button
            type="button"
            class="btn-secondary rounded-full px-5 py-3 text-sm font-bold"
            :disabled="isGeneratingPlan"
            :class="isGeneratingPlan ? 'cursor-not-allowed opacity-70' : ''"
            @click="clearPlannerContent"
          >
            一键清空内容
          </button>
        </div>
      </div>

      <AiErrorNotice
        v-if="plannerBreakdownEntry.status === 'error'"
        class="card-base"
        title="计划草稿生成失败"
        :presentation="plannerErrorPresentation"
        @action="handlePlannerErrorAction"
      />
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import AiErrorNotice from '@/components/AiErrorNotice.vue'
import { aiBreakdownPreviewApi, type AiBreakdownPreviewResponse } from '@/api/ai'
import { useAiPendingRequest } from '@/composables/useAiPendingRequest'
import { AI_PENDING_BOARDS, useAiPendingRegistryStore } from '@/stores/aiPendingRegistry'
import { useToast } from '@/composables/useToast'
import {
  resolveAiErrorPresentation,
  type AiRecoveryAction,
} from '@/utils/aiErrorPresentation'
import { clearAiPlannerDraftCache, readAiPlannerDraftCache, writeAiPlannerDraftCache } from '@/utils/appCache'

interface PlannerForm {
  target: string
  description: string
  duration: string
  detailed: boolean
}

interface PersistedPlannerDraft {
  aiForm?: Partial<PlannerForm>
}

const AI_SLOW_HINT_DELAY_MS = 15_000

const router = useRouter()
const toast = useToast()
const aiPendingRegistry = useAiPendingRegistryStore()
const { runAiRequest } = useAiPendingRequest()

const aiForm = ref<PlannerForm>({
  target: '',
  description: '',
  duration: '',
  detailed: false,
})
const isViewMounted = ref(false)
const targetInput = ref<HTMLInputElement | null>(null)
const isSlowGeneration = ref(false)
let persistDraftTimer: ReturnType<typeof setTimeout> | null = null
let slowGenerationTimer: ReturnType<typeof setTimeout> | null = null

const plannerBreakdownEntry = computed(
  () => aiPendingRegistry.boards[AI_PENDING_BOARDS.AI_PLANNER_BREAKDOWN],
)
const isGeneratingPlan = computed(() => plannerBreakdownEntry.value.status === 'pending')
const plannerErrorPresentation = computed(
  () => plannerBreakdownEntry.value.errorPresentation
    || resolveAiErrorPresentation(null, 'AI 计划草稿生成失败，请稍后手动重试。'),
)

const clearSlowGenerationTimer = () => {
  if (slowGenerationTimer) {
    clearTimeout(slowGenerationTimer)
    slowGenerationTimer = null
  }
  isSlowGeneration.value = false
}

const scheduleSlowGenerationHint = () => {
  clearSlowGenerationTimer()
  if (!isGeneratingPlan.value) return

  const elapsed = Date.now() - plannerBreakdownEntry.value.updatedAt
  const remaining = Math.max(0, AI_SLOW_HINT_DELAY_MS - elapsed)
  if (remaining === 0) {
    isSlowGeneration.value = true
    return
  }

  slowGenerationTimer = setTimeout(() => {
    if (isGeneratingPlan.value) isSlowGeneration.value = true
  }, remaining)
}

const persistPlannerDraft = () => {
  writeAiPlannerDraftCache<PersistedPlannerDraft>({ aiForm: { ...aiForm.value } })
}

const schedulePersistPlannerDraft = () => {
  if (persistDraftTimer) clearTimeout(persistDraftTimer)
  persistDraftTimer = setTimeout(() => {
    persistDraftTimer = null
    persistPlannerDraft()
  }, 250)
}

const flushPersistPlannerDraft = () => {
  if (persistDraftTimer) {
    clearTimeout(persistDraftTimer)
    persistDraftTimer = null
  }
  persistPlannerDraft()
}

const hydrateDraftFromStorage = () => {
  const cached = readAiPlannerDraftCache<PersistedPlannerDraft>()
  const form = cached?.aiForm
  if (!form || typeof form !== 'object') return

  aiForm.value = {
    target: typeof form.target === 'string' ? form.target : '',
    description: typeof form.description === 'string' ? form.description : '',
    duration: typeof form.duration === 'string' ? form.duration : '',
    detailed: form.detailed === true,
  }
}

const isBreakdownPreviewResponse = (value: unknown): value is AiBreakdownPreviewResponse => {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    typeof record.draftId === 'string' &&
    Boolean(record.draftId.trim()) &&
    typeof record.expireAt === 'string' &&
    Array.isArray(record.milestones)
  )
}

const consumePendingGeneratedDraft = async () => {
  const entry = plannerBreakdownEntry.value
  if (entry.status !== 'success' || !isViewMounted.value) return

  if (!isBreakdownPreviewResponse(entry.responsePayload)) {
    toast.error('AI 返回的草稿信息格式异常，请重新生成。')
    aiPendingRegistry.markConsumed(AI_PENDING_BOARDS.AI_PLANNER_BREAKDOWN, entry.requestId)
    return
  }

  const draftId = entry.responsePayload.draftId.trim()
  aiPendingRegistry.markConsumed(AI_PENDING_BOARDS.AI_PLANNER_BREAKDOWN, entry.requestId)
  await router.push({ name: 'ai-draft-detail', params: { draftId } })
}

const generatePlan = async () => {
  const target = aiForm.value.target.trim()
  const duration = aiForm.value.duration.trim()
  if (!target || !duration) {
    toast.error('请先填写目标和期望周期。')
    return
  }

  const result = await runAiRequest<AiBreakdownPreviewResponse>({
    board: AI_PENDING_BOARDS.AI_PLANNER_BREAKDOWN,
    requestMeta: {
      target,
      duration,
      hasDescription: Boolean(aiForm.value.description.trim()),
      detailed: aiForm.value.detailed,
    },
    onStart: scheduleSlowGenerationHint,
    request: () =>
      aiBreakdownPreviewApi({
        target,
        description: aiForm.value.description.trim() || undefined,
        duration,
        detailed: aiForm.value.detailed,
      }),
    successMessage: 'AI 计划草稿已生成。',
    errorMessage: 'AI 计划草稿生成失败，请稍后手动重试。',
  })

  if (result.status === 'blocked') {
    toast.warning('AI 正在生成计划，请等待当前请求完成。')
    return
  }
  if (result.status !== 'success' || !isViewMounted.value) return
  await consumePendingGeneratedDraft()
}

const handlePlannerErrorAction = (action: AiRecoveryAction) => {
  if (action === 'RETRY') {
    void generatePlan()
    return
  }
  if (action === 'EDIT_INPUT') targetInput.value?.focus()
}

const clearPlannerContent = () => {
  if (isGeneratingPlan.value) return
  aiForm.value = { target: '', description: '', duration: '', detailed: false }
  clearAiPlannerDraftCache()
  if (plannerBreakdownEntry.value.status !== 'pending') {
    aiPendingRegistry.resetBoard(AI_PENDING_BOARDS.AI_PLANNER_BREAKDOWN)
  }
  toast.success('内容已清空。')
}

watch(aiForm, schedulePersistPlannerDraft, { deep: true })

watch(
  () => plannerBreakdownEntry.value.status,
  (status) => {
    if (status === 'pending') {
      scheduleSlowGenerationHint()
      return
    }
    clearSlowGenerationTimer()
    if (status === 'success' && isViewMounted.value) {
      void consumePendingGeneratedDraft()
    }
  },
)

onMounted(() => {
  isViewMounted.value = true
  hydrateDraftFromStorage()
  if (isGeneratingPlan.value) scheduleSlowGenerationHint()
  void consumePendingGeneratedDraft()
})

onBeforeUnmount(() => {
  isViewMounted.value = false
  flushPersistPlannerDraft()
  clearSlowGenerationTimer()
})
</script>
