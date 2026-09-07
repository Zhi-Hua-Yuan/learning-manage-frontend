<template>
  <main class="min-h-full p-6 lg:p-8">
    <div class="mx-auto max-w-7xl space-y-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-text-tertiary)]">Stage 7</p>
          <h1 class="mt-1 text-2xl font-black text-[var(--color-text-primary)]">AI 生产运维</h1>
          <p class="mt-2 text-sm text-[var(--color-text-secondary)]">仅展示脱敏元数据、健康状态与生命周期运行记录。</p>
          <p v-if="overview" class="mt-1 text-xs text-[var(--color-text-tertiary)]">MySQL 审计窗口：{{ formatTime(overview.from) }} 至 {{ formatTime(overview.to) }}；Grafana 展示 Prometheus 实时窗口。</p>
        </div>
        <button class="input-base px-4 py-2 text-sm font-semibold" :disabled="loading" @click="loadAll">刷新</button>
      </header>

      <div v-if="errorMessage" class="rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] p-4 text-sm text-[var(--color-danger)]">{{ errorMessage }}</div>

      <section class="grid gap-4 md:grid-cols-3">
        <article v-for="card in cards" :key="card.label" class="surface-panel rounded-2xl p-5">
          <p class="text-sm text-[var(--color-text-secondary)]">{{ card.label }}</p>
          <p class="mt-2 text-3xl font-black text-[var(--color-text-primary)]">{{ card.value }}</p>
          <p class="mt-2 text-xs text-[var(--color-text-tertiary)]">{{ card.detail }}</p>
        </article>
      </section>

      <section class="surface-panel rounded-2xl p-5">
        <div class="flex items-center justify-between gap-3">
          <div><h2 class="font-bold text-[var(--color-text-primary)]">依赖健康</h2><p class="text-xs text-[var(--color-text-tertiary)]">AI 依赖失败不会伪装成核心服务故障</p></div>
          <a v-if="grafanaUrl" :href="grafanaUrl" target="_blank" rel="noopener noreferrer" class="text-sm font-semibold text-[var(--color-primary)]">打开 Grafana</a>
        </div>
        <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="dependency in dependencies" :key="dependency.name" class="rounded-xl border border-[var(--color-card-border)] p-3">
            <div class="flex items-center justify-between gap-2"><span class="font-semibold">{{ dependency.name }}</span><span class="rounded-full px-2 py-0.5 text-xs" :class="statusClass(dependency.status)">{{ dependency.status }}</span></div>
            <p class="mt-2 text-xs text-[var(--color-text-tertiary)]">{{ dependency.detail }} · {{ formatTime(dependency.checkedAt) }}</p>
          </div>
        </div>
      </section>

      <section class="grid gap-4 lg:grid-cols-2">
        <article class="surface-panel rounded-2xl p-5">
          <h2 class="font-bold text-[var(--color-text-primary)]">知识索引队列</h2>
          <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div v-for="(count, status) in overview?.knowledgeQueue" :key="status" class="rounded-xl bg-[var(--color-bg-page)] p-3"><p class="text-xs text-[var(--color-text-tertiary)]">{{ status }}</p><p class="mt-1 text-xl font-black">{{ count }}</p></div>
          </div>
        </article>
        <article class="surface-panel rounded-2xl p-5">
          <h2 class="font-bold text-[var(--color-text-primary)]">最近失败</h2>
          <div class="mt-3 space-y-2">
            <div v-for="failure in failures" :key="`${failure.source}-${failure.traceId}-${failure.occurredAt}`" class="rounded-xl bg-[var(--color-bg-page)] p-3 text-xs">
              <div class="flex justify-between"><strong>{{ failure.source }} · {{ failure.failureType }}</strong><span>{{ failure.status }}</span></div>
              <p class="mt-1 font-mono text-[var(--color-text-tertiary)]">Trace {{ failure.traceId || '-' }}</p>
            </div>
            <p v-if="failures.length === 0" class="py-6 text-center text-sm text-[var(--color-text-tertiary)]">当前时间窗口没有失败记录</p>
          </div>
        </article>
      </section>

      <section class="surface-panel rounded-2xl p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div><h2 class="font-bold text-[var(--color-text-primary)]">数据生命周期</h2><p class="text-xs text-[var(--color-text-tertiary)]">先预演并选择审核通过的 Dry Run，再提交与其绑定的正式清理</p></div>
          <div class="flex gap-2">
            <button class="input-base px-3 py-2 text-sm" :disabled="submitting" @click="submit(true)">运行 Dry Run</button>
            <button class="rounded-lg bg-[var(--color-danger)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" :disabled="submitting || !reviewedDryRun" @click="submit(false)">正式清理</button>
          </div>
        </div>
        <div class="mt-4 overflow-x-auto">
          <table class="w-full min-w-[760px] text-left text-sm">
            <thead class="text-xs text-[var(--color-text-tertiary)]"><tr><th class="py-2">运行</th><th>类型</th><th>状态</th><th>扫描</th><th>预计</th><th>影响</th><th>创建时间</th></tr></thead>
            <tbody>
              <tr v-for="run in cleanupRuns" :key="run.runId" class="cursor-pointer border-t border-[var(--color-card-border)] hover:bg-[var(--color-menu-hover)]" @click="selectRun(run.runId)">
                <td class="py-3 font-mono text-xs">{{ run.runId }}</td><td>{{ run.dryRun ? 'Dry Run' : '正式' }}</td><td>{{ run.status }}</td><td>{{ run.scannedCount }}</td><td>{{ run.estimatedCount }}</td><td>{{ run.affectedCount }}</td><td>{{ formatTime(run.createTime) }}</td>
              </tr>
              <tr v-if="cleanupRuns.length === 0"><td colspan="7" class="py-8 text-center text-[var(--color-text-tertiary)]">暂无清理记录</td></tr>
            </tbody>
          </table>
        </div>
        <div v-if="selectedRun" class="mt-5 rounded-xl border border-[var(--color-card-border)] p-4">
          <div class="flex items-center justify-between gap-3"><h3 class="font-semibold">运行详情 · {{ selectedRun.runId }}</h3><button v-if="['PENDING','RUNNING'].includes(selectedRun.status)" class="text-sm text-[var(--color-danger)]" @click="cancel(selectedRun.runId)">取消</button></div>
          <div class="mt-3 grid gap-2 md:grid-cols-2">
            <div v-for="item in selectedRun.items" :key="item.resourceType" class="rounded-lg bg-[var(--color-bg-page)] p-3 text-xs">
              <div class="flex justify-between"><strong>{{ item.resourceType }}</strong><span>{{ item.status }}</span></div>
              <p class="mt-1 text-[var(--color-text-tertiary)]">预计 {{ item.estimatedCount }} · 脱敏 {{ item.redactedCount }} · 删除 {{ item.deletedCount }}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { cancelCleanupApi, fetchCleanupRunApi, fetchCleanupRunsApi, fetchOpsFailuresApi, fetchOpsOverviewApi, submitCleanupApi, type CleanupRun, type OpsFailure, type OpsOverview } from '@/api/ops'
import { getUserMeApi } from '@/api/user'
import { normalizeCurrentUserWire } from '@/types/normalization'

const router = useRouter()
const overview = ref<OpsOverview | null>(null)
const cleanupRuns = ref<CleanupRun[]>([])
const failures = ref<OpsFailure[]>([])
const loading = ref(false)
const submitting = ref(false)
const errorMessage = ref('')
const selectedRunId = ref('')
const selectedRunDetail = ref<CleanupRun | null>(null)
let refreshTimer: number | null = null
let disposed = false
const grafanaUrl = import.meta.env.VITE_GRAFANA_URL || ''

const dependencies = computed(() => Object.values(overview.value?.dependencies ?? {}))
const cards = computed(() => [
  { label: 'AI 调用', value: overview.value?.ai.totalCount ?? 0, detail: `P95 ${overview.value?.ai.p95DurationMs ?? '-'} ms` },
  { label: 'RAG 查询', value: overview.value?.rag.totalCount ?? 0, detail: `P95 ${overview.value?.rag.p95DurationMs ?? '-'} ms` },
  { label: 'Agent 运行', value: overview.value?.agent.totalCount ?? 0, detail: `P95 ${overview.value?.agent.p95DurationMs ?? '-'} ms` },
])
const selectedRun = computed(() => selectedRunDetail.value ?? cleanupRuns.value.find((run) => run.runId === selectedRunId.value) ?? null)
const reviewedDryRun = computed(() => {
  const run = selectedRun.value
  return run?.dryRun && run.status === 'SUCCEEDED' ? run : null
})

const loadAll = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const [summary, page, failurePage] = await Promise.all([fetchOpsOverviewApi(), fetchCleanupRunsApi(), fetchOpsFailuresApi()])
    overview.value = summary
    cleanupRuns.value = page.records
    failures.value = failurePage.records
    if (selectedRunId.value) {
      const requestedRunId = selectedRunId.value
      const detail = await fetchCleanupRunApi(requestedRunId).catch(() => null)
      if (!disposed && selectedRunId.value === requestedRunId) selectedRunDetail.value = detail
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '运维数据加载失败'
  } finally { loading.value = false }
}

const submit = async (dryRun: boolean) => {
  submitting.value = true
  errorMessage.value = ''
  try {
    const approvedDryRunId = dryRun ? undefined : reviewedDryRun.value?.runId
    if (!dryRun && !approvedDryRunId) return
    await submitCleanupApi(dryRun, `ops-${dryRun ? 'dry' : 'run'}-${Date.now()}`, approvedDryRunId)
    await loadAll()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '清理任务提交失败'
  } finally { submitting.value = false }
}

const cancel = async (runId: string) => {
  submitting.value = true
  try {
    await cancelCleanupApi(runId)
    await loadAll()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '取消清理任务失败'
  } finally { submitting.value = false }
}

const selectRun = async (runId: string) => {
  selectedRunId.value = runId
  selectedRunDetail.value = null
  const detail = await fetchCleanupRunApi(runId).catch(() => null)
  if (!disposed && selectedRunId.value === runId) selectedRunDetail.value = detail
}

const statusClass = (status: string) => status === 'UP'
  ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]'
  : status === 'DISABLED' || status === 'UNKNOWN'
    ? 'bg-[var(--color-menu-hover)] text-[var(--color-text-secondary)]'
    : 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
const formatTime = (value: string) => value ? new Date(value).toLocaleString() : '-'

onMounted(async () => {
  const currentUser = normalizeCurrentUserWire(await getUserMeApi().catch(() => null))
  if (disposed) return
  if (!currentUser || currentUser.role !== 'SYSTEM_ADMIN') {
    await router.replace('/tasks')
    return
  }
  await loadAll()
  if (disposed) return
  refreshTimer = window.setInterval(() => {
    if (cleanupRuns.value.some((run) => run.status === 'PENDING' || run.status === 'RUNNING')) void loadAll()
  }, 5000)
})

onBeforeUnmount(() => {
  disposed = true
  if (refreshTimer !== null) window.clearInterval(refreshTimer)
})
</script>
