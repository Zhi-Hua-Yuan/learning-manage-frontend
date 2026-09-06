<template>
  <main class="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 p-5 sm:p-8">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-ai)]">Controlled Agent</p>
        <h1 class="mt-2 text-2xl font-black text-[var(--color-text-primary)]">AI 项目分析</h1>
        <p class="mt-2 text-sm text-[var(--color-text-secondary)]">
          Agent 仅调用只读工具，分析结果先形成草稿，确认后才保存为正式报告。
        </p>
      </div>
      <button class="btn-secondary rounded-lg px-4 py-2 text-sm font-bold" type="button" @click="showReports = !showReports">
        {{ showReports ? '返回分析' : '历史报告' }}
      </button>
    </header>

    <AiErrorNotice v-if="errorPresentation" :presentation="errorPresentation" title="Agent 操作失败" />

    <section v-if="!showReports" class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
      <div class="surface-panel space-y-5 rounded-2xl p-5 sm:p-6">
        <div class="flex gap-2 rounded-xl bg-[var(--color-bg-page)] p-1">
          <button
            v-for="item in sceneOptions"
            :key="item.value"
            type="button"
            class="flex-1 rounded-lg px-3 py-2 text-sm font-bold"
            :class="scene === item.value ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)]'"
            :disabled="isActiveRun"
            @click="scene = item.value"
          >
            {{ item.label }}
          </button>
        </div>

        <template v-if="scene === 'PROJECT_RISK'">
          <label class="block text-sm font-bold text-[var(--color-text-body)]" for="agent-project-id">项目 ID</label>
          <input
            id="agent-project-id"
            v-model="projectId"
            data-testid="agent-project-id"
            class="input-base w-full px-3 py-2.5 text-sm"
            inputmode="numeric"
            autocomplete="off"
            :disabled="isActiveRun"
            placeholder="从项目页面进入时会自动带入"
          />
        </template>

        <template v-else>
          <label class="block text-sm font-bold text-[var(--color-text-body)]" for="agent-team-id">管理团队</label>
          <select
            id="agent-team-id"
            v-model="teamId"
            data-testid="agent-team-id"
            class="input-base w-full px-3 py-2.5 text-sm"
            :disabled="isActiveRun"
          >
            <option value="">请选择你管理的团队</option>
            <option v-for="team in manageableTeams" :key="team.id" :value="team.id">{{ team.name || `团队 ${team.id}` }}</option>
          </select>
          <p v-if="!manageableTeams.length" class="text-xs text-[var(--color-text-tertiary)]">
            只有团队 OWNER 或 ADMIN 可以发起成员负载分析。
          </p>
        </template>

        <div class="flex flex-wrap justify-end gap-3">
          <button
            v-if="isActiveRun"
            type="button"
            class="btn-secondary rounded-lg px-4 py-2.5 text-sm font-bold"
            :disabled="canceling"
            @click="cancelRun"
          >
            {{ canceling ? '取消中…' : '取消运行' }}
          </button>
          <button
            type="button"
            data-testid="agent-submit"
            class="btn-ai rounded-lg px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!canSubmit"
            @click="submit"
          >
            {{ submitting ? '正在提交…' : '开始只读分析' }}
          </button>
        </div>
      </div>

      <div class="surface-panel space-y-4 rounded-2xl p-5 sm:p-6" aria-live="polite">
        <h2 class="text-lg font-black text-[var(--color-text-primary)]">运行状态</h2>
        <div v-if="!run" class="rounded-xl bg-[var(--color-bg-page)] p-4 text-sm text-[var(--color-text-secondary)]">
          提交后会显示 Agent 的异步执行进度。关闭页面不会取消服务端 Run。
        </div>
        <template v-else>
          <div class="flex items-center justify-between gap-3">
            <span class="rounded-full px-3 py-1 text-xs font-bold" :class="runStatusClass">{{ runStatusLabel }}</span>
            <span class="text-xs text-[var(--color-text-tertiary)]">{{ run.completedToolCount }}/{{ run.maxToolCount }} Tools</span>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-[var(--color-bg-page)]">
            <div class="h-full bg-[var(--color-primary)] transition-all" :style="{ width: `${progressPercent}%` }"></div>
          </div>
          <dl class="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-xs">
            <dt class="text-[var(--color-text-tertiary)]">当前步骤</dt><dd>{{ run.currentStep || '等待 Worker' }}</dd>
            <dt class="text-[var(--color-text-tertiary)]">编排模式</dt><dd>{{ run.orchestrationMode }}</dd>
            <dt class="text-[var(--color-text-tertiary)]">运行编号</dt><dd class="break-all">{{ run.runId }}</dd>
          </dl>
          <p v-if="run.partialReason" class="rounded-lg bg-[var(--color-warning-soft)] p-3 text-xs text-[var(--color-warning)]">
            {{ run.partialReason }}
          </p>
          <p v-if="run.failureType" class="rounded-lg bg-[var(--color-danger-soft)] p-3 text-xs text-[var(--color-danger)]">
            {{ run.failureType }}
          </p>
        </template>
      </div>
    </section>

    <section v-if="!showReports && draft && draftPayload" class="surface-panel space-y-5 rounded-2xl p-5 sm:p-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-[var(--color-ai)]">AI Draft</p>
          <h2 class="mt-1 text-xl font-black text-[var(--color-text-primary)]">分析草稿</h2>
        </div>
        <span class="text-xs text-[var(--color-text-tertiary)]">确认前会重新校验权限、数据版本和引用</span>
      </div>
      <div class="grid gap-4 md:grid-cols-2">
        <div class="rounded-xl bg-[var(--color-bg-page)] p-4">
          <p class="text-xs font-bold text-[var(--color-text-tertiary)]">风险/负载级别</p>
          <p class="mt-2 text-lg font-black text-[var(--color-text-primary)]">{{ draftPayload.riskLevel || '按成员指标展示' }}</p>
        </div>
        <div class="rounded-xl bg-[var(--color-bg-page)] p-4">
          <p class="text-xs font-bold text-[var(--color-text-tertiary)]">数据版本</p>
          <p class="mt-2 text-lg font-black text-[var(--color-text-primary)]">{{ draftPayload.sourceDataVersion }}</p>
        </div>
      </div>
      <SafeAiText as="div" class="rounded-xl bg-[var(--color-bg-page)] p-4 text-sm leading-7" :text="draftPayload.managerSummary || draftPayload.publicSummary" />
      <div v-if="draftPayload.recommendations?.length" class="space-y-2">
        <h3 class="text-sm font-black text-[var(--color-text-primary)]">建议</h3>
        <SafeAiText
          v-for="(recommendation, index) in draftPayload.recommendations"
          :key="index"
          as="div"
          class="rounded-lg border border-[var(--color-border)] p-3 text-sm"
          :text="recommendation"
        />
      </div>
      <div class="flex justify-end gap-3">
        <button type="button" class="btn-secondary rounded-lg px-4 py-2.5 text-sm font-bold" @click="cancelDraft">取消草稿</button>
        <button
          type="button"
          data-testid="agent-confirm"
          class="btn-primary rounded-lg px-5 py-2.5 text-sm font-bold"
          :disabled="confirming"
          @click="confirmDraft"
        >
          {{ confirming ? '确认中…' : '确认保存报告' }}
        </button>
      </div>
    </section>

    <section v-if="showReports" class="surface-panel space-y-4 rounded-2xl p-5 sm:p-6">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-black text-[var(--color-text-primary)]">历史分析报告</h2>
        <button type="button" class="btn-secondary rounded-lg px-3 py-2 text-xs font-bold" :disabled="reportsLoading" @click="loadReports">刷新</button>
      </div>
      <p v-if="reportsLoading" class="text-sm text-[var(--color-text-secondary)]">正在加载报告…</p>
      <p v-else-if="!reports.length" class="rounded-xl bg-[var(--color-bg-page)] p-4 text-sm text-[var(--color-text-secondary)]">暂无已确认报告。</p>
      <button
        v-for="report in reports"
        :key="report.reportId"
        type="button"
        class="interactive-row flex w-full items-start justify-between gap-4 rounded-xl border border-[var(--color-border)] p-4 text-left"
        @click="router.push(`/ai-report/${encodeURIComponent(report.reportId)}`)"
      >
        <span class="min-w-0">
          <span class="block text-sm font-black text-[var(--color-text-primary)]">{{ report.reportType === 'PROJECT_RISK' ? '项目风险报告' : '团队负载报告' }}</span>
          <SafeAiText as="span" class="mt-1 block line-clamp-2 text-xs text-[var(--color-text-secondary)]" :text="report.summary" />
        </span>
        <span class="shrink-0 rounded-full px-2.5 py-1 text-xs" :class="report.status === 'STALE' ? 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]' : 'bg-[var(--color-success-soft)] text-[var(--color-success)]'">
          {{ report.status === 'STALE' ? '数据已变化' : '当前有效' }}
        </span>
      </button>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AiErrorNotice from '@/components/AiErrorNotice.vue'
import SafeAiText from '@/components/SafeAiText.vue'
import {
  cancelAgentRunApi,
  cancelAiDraftApi,
  confirmAgentReportApi,
  getAgentRunApi,
  getAiDraftDetailApi,
  listAnalysisReportsApi,
  submitProjectRiskAgentApi,
  submitTeamWorkloadAgentApi,
  type AgentRunResponse,
  type AgentScene,
  type AiDraftDetailResponse,
  type AnalysisReportResponse,
} from '@/api/ai'
import { useCollaborationStore } from '@/stores/collaboration'
import { resolveAiErrorPresentation, type AiErrorPresentation } from '@/utils/aiErrorPresentation'

interface DraftPayload {
  sourceRunId: string
  reportType: AgentScene
  sourceDataVersion: number
  riskLevel?: string | null
  managerSummary?: string | null
  publicSummary?: string | null
  recommendations?: string[]
}

const route = useRoute()
const router = useRouter()
const collaboration = useCollaborationStore()
const scene = ref<AgentScene>('PROJECT_RISK')
const projectId = ref('')
const teamId = ref('')
const submitting = ref(false)
const canceling = ref(false)
const confirming = ref(false)
const run = ref<AgentRunResponse | null>(null)
const draft = ref<AiDraftDetailResponse | null>(null)
const draftPayload = ref<DraftPayload | null>(null)
const errorPresentation = ref<AiErrorPresentation | null>(null)
const showReports = ref(false)
const reports = ref<AnalysisReportResponse[]>([])
const reportsLoading = ref(false)
let pollTimer: ReturnType<typeof setTimeout> | null = null
let pollDelay = 1000

const sceneOptions: Array<{ value: AgentScene; label: string }> = [
  { value: 'PROJECT_RISK', label: '项目风险' },
  { value: 'TEAM_WORKLOAD', label: '团队负载' },
]
const terminalStatuses = new Set(['SUCCEEDED', 'PARTIAL', 'FAILED', 'TIMED_OUT', 'CANCELED'])
const manageableTeams = computed(() => collaboration.teams.filter((team) => team.role === 'OWNER' || team.role === 'ADMIN'))
const isActiveRun = computed(() => Boolean(run.value && !terminalStatuses.has(run.value.status)))
const canSubmit = computed(() => !submitting.value && !isActiveRun.value && (
  scene.value === 'PROJECT_RISK' ? /^\d+$/.test(projectId.value.trim()) : /^\d+$/.test(teamId.value.trim())
))
const progressPercent = computed(() => {
  if (!run.value) return 0
  if (terminalStatuses.has(run.value.status)) return 100
  return Math.max(8, Math.round((run.value.completedToolCount / Math.max(run.value.maxToolCount, 1)) * 100))
})
const runStatusLabel = computed(() => ({
  PENDING: '等待执行', RUNNING: '正在分析', SUCCEEDED: '分析完成', PARTIAL: '部分完成',
  FAILED: '分析失败', TIMED_OUT: '执行超时', CANCELED: '已取消',
}[run.value?.status || 'PENDING']))
const runStatusClass = computed(() => {
  if (run.value?.status === 'SUCCEEDED') return 'bg-[var(--color-success-soft)] text-[var(--color-success)]'
  if (run.value?.status === 'PARTIAL' || run.value?.status === 'TIMED_OUT') return 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]'
  if (run.value?.status === 'FAILED' || run.value?.status === 'CANCELED') return 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
  return 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
})

const uuid = () => typeof globalThis.crypto?.randomUUID === 'function'
  ? globalThis.crypto.randomUUID()
  : `${Date.now()}-${Math.random().toString(16).slice(2)}`

const submit = async () => {
  if (!canSubmit.value) return
  clearPolling()
  submitting.value = true
  errorPresentation.value = null
  draft.value = null
  draftPayload.value = null
  try {
    const response = scene.value === 'PROJECT_RISK'
      ? await submitProjectRiskAgentApi(projectId.value.trim(), uuid())
      : await submitTeamWorkloadAgentApi(teamId.value.trim(), uuid())
    run.value = { ...response, scene: scene.value, currentStep: null, completedToolCount: 0,
      maxToolCount: 4, orchestrationMode: 'FIXED_WORKFLOW', degraded: false,
      partialReason: null, failureType: null, draftId: null, submittedAt: null,
      startedAt: null, finishedAt: null }
    pollDelay = 1000
    schedulePoll()
  } catch (error) {
    errorPresentation.value = resolveAiErrorPresentation(error, 'Agent 提交失败，请稍后重试。')
  } finally {
    submitting.value = false
  }
}

const schedulePoll = () => {
  if (!run.value || terminalStatuses.has(run.value.status)) return
  pollTimer = setTimeout(() => void pollRun(), pollDelay)
  pollDelay = Math.min(pollDelay * 2, 5000)
}

const pollRun = async () => {
  if (!run.value) return
  try {
    run.value = await getAgentRunApi(run.value.runId)
    if ((run.value.status === 'SUCCEEDED' || run.value.status === 'PARTIAL') && run.value.draftId) {
      await loadDraft(run.value.draftId)
      return
    }
    schedulePoll()
  } catch (error) {
    errorPresentation.value = resolveAiErrorPresentation(error, 'Agent 状态查询失败。')
  }
}

const cancelRun = async () => {
  if (!run.value || !isActiveRun.value) return
  canceling.value = true
  try {
    const response = await cancelAgentRunApi(run.value.runId)
    run.value = { ...run.value, status: response.status }
    if (response.status !== 'CANCELED') schedulePoll()
  } catch (error) {
    errorPresentation.value = resolveAiErrorPresentation(error, '取消 Agent 失败。')
  } finally {
    canceling.value = false
  }
}

const loadDraft = async (draftId: string) => {
  const detail = await getAiDraftDetailApi(draftId)
  if (!['project-risk-report', 'team-workload-report'].includes(detail.scene)) throw new Error('草稿场景不匹配')
  const parsed = JSON.parse(detail.payloadJson) as DraftPayload
  if (!parsed.sourceRunId || !parsed.reportType || !Number.isFinite(parsed.sourceDataVersion)) throw new Error('草稿结构不合法')
  draft.value = detail
  draftPayload.value = parsed
}

const confirmDraft = async () => {
  if (!draft.value || confirming.value) return
  confirming.value = true
  try {
    await confirmAgentReportApi(draft.value.draftId, uuid())
    draft.value = null
    draftPayload.value = null
    showReports.value = true
    await loadReports()
  } catch (error) {
    errorPresentation.value = resolveAiErrorPresentation(error, '确认报告失败，请重新分析。')
  } finally {
    confirming.value = false
  }
}

const cancelDraft = async () => {
  if (!draft.value) return
  try {
    await cancelAiDraftApi({ draftId: draft.value.draftId })
    draft.value = null
    draftPayload.value = null
  } catch (error) {
    errorPresentation.value = resolveAiErrorPresentation(error, '取消草稿失败。')
  }
}

const loadReports = async () => {
  reportsLoading.value = true
  try {
    reports.value = (await listAnalysisReportsApi({ current: 1, pageSize: 20 })).records || []
  } catch (error) {
    errorPresentation.value = resolveAiErrorPresentation(error, '报告列表加载失败。')
  } finally {
    reportsLoading.value = false
  }
}

const clearPolling = () => {
  if (pollTimer) clearTimeout(pollTimer)
  pollTimer = null
}

watch(showReports, (value) => { if (value) void loadReports() })
onMounted(async () => {
  projectId.value = typeof route.query.projectId === 'string' ? route.query.projectId : ''
  await collaboration.bootstrapCollaborationContext().catch(() => undefined)
})
onBeforeUnmount(clearPolling)
</script>
