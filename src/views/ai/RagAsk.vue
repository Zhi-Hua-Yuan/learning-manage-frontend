<template>
  <main class="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-6 p-5 sm:p-8">
    <header>
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-ai)]">Grounded AI</p>
      <h1 class="mt-2 text-2xl font-black text-[var(--color-text-primary)]">AI 项目问答</h1>
      <p class="mt-2 text-sm text-[var(--color-text-secondary)]">
        基于你有权访问的任务和周复盘回答，并为关键结论提供来源。
      </p>
    </header>

    <section class="surface-panel space-y-4 rounded-2xl p-5 sm:p-6">
      <label class="block text-sm font-bold text-[var(--color-text-body)]" for="rag-project-id">
        项目 ID
      </label>
      <input
        id="rag-project-id"
        data-testid="rag-project-id"
        v-model="projectId"
        class="input-base w-full px-3 py-2 text-sm"
        inputmode="numeric"
        autocomplete="off"
        placeholder="从左侧选择项目，或输入项目 ID"
      />

      <label class="block text-sm font-bold text-[var(--color-text-body)]" for="rag-question">
        问题
      </label>
      <textarea
        id="rag-question"
        data-testid="rag-question"
        v-model="question"
        class="input-base min-h-32 w-full resize-y px-3 py-3 text-sm"
        maxlength="1000"
        placeholder="例如：这个项目最近推进慢的原因是什么？"
        @keydown.ctrl.enter.prevent="submit"
        @keydown.meta.enter.prevent="submit"
      ></textarea>
      <div class="flex items-center justify-between gap-4">
        <span class="text-xs text-[var(--color-text-tertiary)]">{{ question.length }}/1000 · Ctrl/⌘ + Enter 提交</span>
        <button
          type="button"
          data-testid="rag-submit"
          class="btn-primary rounded-lg px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!canSubmit"
          @click="submit"
        >
          {{ loading ? '正在检索…' : '获取有依据的回答' }}
        </button>
      </div>
    </section>

    <AiErrorNotice
      v-if="errorPresentation"
      :presentation="errorPresentation"
      title="项目问答失败"
      @action="handleRecovery"
    />

    <section v-if="result" class="surface-panel space-y-5 rounded-2xl p-5 sm:p-6" aria-live="polite">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-black text-[var(--color-text-primary)]">回答</h2>
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-[var(--color-primary)]">
            {{ statusLabel }}
          </span>
          <span
            v-if="result.degraded"
            class="rounded-full bg-[var(--color-warning-soft)] px-2.5 py-1 text-[var(--color-warning)]"
          >
            已降级检索
          </span>
        </div>
      </div>

      <div
        v-if="result.status === 'STALE'"
        class="rounded-xl border border-[var(--color-warning)]/40 bg-[var(--color-warning-soft)] p-4 text-sm text-[var(--color-text-body)]"
      >
        来源内容已经变化，旧回答不再作为当前结论展示。请重新提问。
      </div>
      <SafeAiText
        v-else
        as="div"
        data-testid="rag-answer"
        class="rounded-xl bg-[var(--color-bg-page)] p-4 text-sm leading-7 text-[var(--color-text-body)]"
        :text="result.answer"
      />

      <p v-if="result.insufficientEvidence" class="text-sm text-[var(--color-warning)]">
        当前可访问记录不足，系统没有生成确定性结论。
      </p>
      <p v-if="result.degradationReason" class="text-xs text-[var(--color-text-tertiary)]">
        降级原因：{{ result.degradationReason }}
      </p>

      <div v-if="result.sources.length" class="space-y-3">
        <h3 class="text-sm font-black text-[var(--color-text-primary)]">引用来源</h3>
        <button
          v-for="source in result.sources"
          :key="`${source.citationId}:${source.sourceType}:${source.sourceId}`"
          type="button"
          data-testid="rag-source"
          class="interactive-row flex w-full items-start gap-3 rounded-xl border border-[var(--color-border)] p-4 text-left"
          @click="openSource(source)"
        >
          <span class="rounded-md bg-[var(--color-primary-soft)] px-2 py-1 text-xs font-black text-[var(--color-primary)]">
            {{ source.citationId }}
          </span>
          <span class="min-w-0 flex-1">
            <SafeAiText as="span" class="block truncate text-sm font-bold text-[var(--color-text-primary)]" :text="source.title" />
            <span class="mt-1 block text-xs text-[var(--color-text-tertiary)]">
              {{ source.sourceType === 'TASK' ? '任务' : '周复盘' }} · 相关度 {{ formatScore(source.score) }}
            </span>
          </span>
        </button>
      </div>

      <p class="text-xs text-[var(--color-text-tertiary)]">
        请求编号 {{ result.requestId }}<span v-if="result.knowledgeAsOf"> · 知识时间 {{ formatTime(result.knowledgeAsOf) }}</span>
      </p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AiErrorNotice from '@/components/AiErrorNotice.vue'
import SafeAiText from '@/components/SafeAiText.vue'
import { ragAskApi, type RagAnswerResponse, type RagSource } from '@/api/ai'
import { readSelectedProjectIdCache, writeSelectedProjectIdCache } from '@/utils/appCache'
import { resolveAiErrorPresentation, type AiErrorPresentation, type AiRecoveryAction } from '@/utils/aiErrorPresentation'

const route = useRoute()
const router = useRouter()
const projectId = ref('')
const question = ref('')
const loading = ref(false)
const result = ref<RagAnswerResponse | null>(null)
const errorPresentation = ref<AiErrorPresentation | null>(null)

const canSubmit = computed(() => (
  !loading.value
  && /^\d+$/.test(projectId.value.trim())
  && question.value.trim().length > 0
))

const statusLabel = computed(() => {
  if (!result.value) return ''
  return {
    ACTIVE: '当前有效',
    STALE: '来源已变化',
    INVALIDATED: '结果已失效',
    EXPIRED: '结果已过期',
  }[result.value.status]
})

const submit = async () => {
  if (!canSubmit.value) return
  loading.value = true
  errorPresentation.value = null
  result.value = null
  const normalizedProjectId = projectId.value.trim()
  try {
    const response = await ragAskApi({
      projectId: normalizedProjectId,
      question: question.value.trim(),
    })
    result.value = response
    writeSelectedProjectIdCache(normalizedProjectId)
    await router.replace({ query: { ...route.query, projectId: normalizedProjectId, requestId: response.requestId } })
  } catch (error) {
    errorPresentation.value = resolveAiErrorPresentation(error, '项目问答失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

const handleRecovery = (action: AiRecoveryAction) => {
  if (action === 'RETRY') void submit()
}

const openSource = async (source: RagSource) => {
  if (source.sourceType === 'TASK') {
    await router.push({ path: '/tasks', query: { projectId: projectId.value, taskId: String(source.sourceId) } })
    return
  }
  await router.push({ path: '/review', query: { projectId: projectId.value, reviewId: String(source.sourceId) } })
}

const formatScore = (score: number) => `${Math.round(Math.max(0, Math.min(1, score)) * 100)}%`
const formatTime = (value: string) => new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value))

onMounted(() => {
  const routeProjectId = typeof route.query.projectId === 'string' ? route.query.projectId : ''
  projectId.value = routeProjectId || readSelectedProjectIdCache() || ''
})
</script>
