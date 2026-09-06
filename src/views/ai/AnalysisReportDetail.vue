<template>
  <main class="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-6 p-5 sm:p-8">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-ai)]">Confirmed Report</p>
        <h1 class="mt-2 text-2xl font-black text-[var(--color-text-primary)]">AI 分析报告</h1>
      </div>
      <button type="button" class="btn-secondary rounded-lg px-4 py-2 text-sm font-bold" @click="router.push('/ai-agent')">返回工作台</button>
    </header>

    <AiErrorNotice v-if="errorPresentation" :presentation="errorPresentation" title="报告加载失败" />
    <p v-if="loading" class="surface-panel rounded-2xl p-6 text-sm text-[var(--color-text-secondary)]">正在加载报告…</p>

    <section v-else-if="report" class="surface-panel space-y-6 rounded-2xl p-5 sm:p-7">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-xl font-black text-[var(--color-text-primary)]">{{ report.reportType === 'PROJECT_RISK' ? '项目风险报告' : '团队负载报告' }}</h2>
          <p class="mt-1 text-xs text-[var(--color-text-tertiary)]">生成于 {{ formatTime(report.generatedAt) }}</p>
        </div>
        <span class="rounded-full px-3 py-1 text-xs font-bold" :class="report.status === 'STALE' ? 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]' : 'bg-[var(--color-success-soft)] text-[var(--color-success)]'">
          {{ report.status === 'STALE' ? '数据已变化' : '当前有效' }}
        </span>
      </div>

      <p v-if="report.status === 'STALE'" class="rounded-xl bg-[var(--color-warning-soft)] p-4 text-sm text-[var(--color-warning)]">
        项目或团队数据已发生变化，本报告只代表生成时快照，请重新运行 Agent 获取当前结论。
      </p>
      <SafeAiText as="div" class="rounded-xl bg-[var(--color-bg-page)] p-4 text-sm leading-7" :text="report.summary" />

      <div v-if="report.recommendations.length" class="space-y-3">
        <h3 class="text-sm font-black text-[var(--color-text-primary)]">建议</h3>
        <SafeAiText v-for="(item, index) in report.recommendations" :key="index" as="div" class="rounded-xl border border-[var(--color-border)] p-4 text-sm" :text="item" />
      </div>

      <div v-if="Object.keys(report.memberMetrics || {}).length" class="space-y-3">
        <h3 class="text-sm font-black text-[var(--color-text-primary)]">可见负载指标</h3>
        <pre class="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-[var(--color-bg-page)] p-4 text-xs text-[var(--color-text-body)]">{{ formattedMetrics }}</pre>
      </div>

      <div v-if="report.sources.length" class="space-y-3">
        <h3 class="text-sm font-black text-[var(--color-text-primary)]">分析来源</h3>
        <button v-for="source in report.sources" :key="source.citationId" type="button" class="interactive-row flex w-full items-center gap-3 rounded-xl border border-[var(--color-border)] p-4 text-left" @click="openSource(source)">
          <span class="rounded-md bg-[var(--color-primary-soft)] px-2 py-1 text-xs font-black text-[var(--color-primary)]">{{ source.citationId }}</span>
          <SafeAiText as="span" class="min-w-0 flex-1 truncate text-sm font-bold" :text="source.title" />
        </button>
      </div>

      <div class="flex justify-end">
        <button type="button" class="rounded-lg bg-[var(--color-danger-soft)] px-4 py-2 text-sm font-bold text-[var(--color-danger)]" @click="showDeleteDialog = true">删除报告</button>
      </div>
    </section>

    <AppConfirmDialog v-model="showDeleteDialog" variant="danger" icon-name="warning" title="删除这份报告？" message="仅删除报告，不会修改项目、任务或周复盘。" confirm-text="确认删除" cancel-text="返回" :loading="deleting" @confirm="deleteReport" />
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AiErrorNotice from '@/components/AiErrorNotice.vue'
import AppConfirmDialog from '@/components/AppConfirmDialog.vue'
import SafeAiText from '@/components/SafeAiText.vue'
import { deleteAnalysisReportApi, getAnalysisReportApi, type AgentReportSource, type AnalysisReportResponse } from '@/api/ai'
import { resolveAiErrorPresentation, type AiErrorPresentation } from '@/utils/aiErrorPresentation'

const route = useRoute()
const router = useRouter()
const report = ref<AnalysisReportResponse | null>(null)
const loading = ref(true)
const deleting = ref(false)
const showDeleteDialog = ref(false)
const errorPresentation = ref<AiErrorPresentation | null>(null)
const formattedMetrics = computed(() => JSON.stringify(report.value?.memberMetrics || {}, null, 2))

const load = async () => {
  loading.value = true
  try {
    report.value = await getAnalysisReportApi(String(route.params.reportId || ''))
  } catch (error) {
    errorPresentation.value = resolveAiErrorPresentation(error, '分析报告加载失败。')
  } finally {
    loading.value = false
  }
}

const openSource = async (source: AgentReportSource) => {
  const projectId = report.value?.projectId == null ? undefined : String(report.value.projectId)
  if (source.sourceType === 'TASK') await router.push({ path: '/tasks', query: { projectId, taskId: String(source.sourceId) } })
  else await router.push({ path: '/review', query: { projectId, reviewId: String(source.sourceId) } })
}

const deleteReport = async () => {
  if (!report.value || deleting.value) return
  deleting.value = true
  try {
    await deleteAnalysisReportApi(report.value.reportId)
    showDeleteDialog.value = false
    await router.push('/ai-agent')
  } catch (error) {
    errorPresentation.value = resolveAiErrorPresentation(error, '删除报告失败。')
  } finally {
    deleting.value = false
  }
}

const formatTime = (value: string) => new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
onMounted(load)
</script>
