import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  bootstrap: vi.fn(),
  cancelDraft: vi.fn(),
  cancelRun: vi.fn(),
  confirmReport: vi.fn(),
  getDraft: vi.fn(),
  getRun: vi.fn(),
  listReports: vi.fn(),
  push: vi.fn(),
  submitProjectRisk: vi.fn(),
  submitTeamWorkload: vi.fn(),
}))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return {
    ...actual,
    useRoute: () => ({ query: { projectId: '2098698814079639554' } }),
    useRouter: () => ({ push: mocks.push }),
  }
})

vi.mock('@/stores/collaboration', () => ({
  useCollaborationStore: () => ({
    teams: [],
    bootstrapCollaborationContext: mocks.bootstrap,
  }),
}))

vi.mock('@/api/ai', () => ({
  cancelAgentRunApi: mocks.cancelRun,
  cancelAiDraftApi: mocks.cancelDraft,
  confirmAgentReportApi: mocks.confirmReport,
  getAgentRunApi: mocks.getRun,
  getAiDraftDetailApi: mocks.getDraft,
  listAnalysisReportsApi: mocks.listReports,
  submitProjectRiskAgentApi: mocks.submitProjectRisk,
  submitTeamWorkloadAgentApi: mocks.submitTeamWorkload,
}))

import AgentWorkbench from '@/views/ai/AgentWorkbench.vue'

const successfulRun = {
  runId: 'run-1',
  scene: 'PROJECT_RISK',
  status: 'SUCCEEDED',
  currentStep: 'DRAFT_READY',
  completedToolCount: 3,
  maxToolCount: 4,
  orchestrationMode: 'TOOL_CALLING',
  degraded: false,
  partialReason: null,
  failureType: null,
  draftId: 'draft-1',
  submittedAt: '2026-09-12T17:08:04.825',
  startedAt: '2026-09-12T17:08:05.516',
  finishedAt: '2026-09-12T17:08:11.637',
}

const draftDetail = {
  draftId: 'draft-1',
  scene: 'project-risk-report',
  status: 0,
  statusText: '预览中',
  payloadJson: JSON.stringify({
    sourceRunId: 'run-1',
    reportType: 'PROJECT_RISK',
    sourceDataVersion: '9',
    projectId: '2098698814079639554',
    riskLevel: 'LOW',
    managerSummary: '项目整体风险较低。',
    recommendations: [],
  }),
  expireAt: '2026-09-12T17:38:12',
  confirmedAt: null,
  canceledAt: null,
}

const submitAndAdvanceToFirstPoll = async () => {
  const wrapper = mount(AgentWorkbench)
  await flushPromises()
  await wrapper.get('[data-testid="agent-submit"]').trigger('click')
  await flushPromises()
  vi.advanceTimersByTime(1000)
  await flushPromises()
  return wrapper
}

describe('AgentWorkbench', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mocks.bootstrap.mockResolvedValue(undefined)
    mocks.submitProjectRisk.mockResolvedValue({ runId: 'run-1', status: 'PENDING' })
    mocks.getRun.mockResolvedValue(successfulRun)
    mocks.getDraft.mockResolvedValue(draftDetail)
    mocks.listReports.mockResolvedValue({ records: [], current: 1, size: 20, total: 0, pages: 0 })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders an Agent draft whose Long data version is serialized as a string', async () => {
    const wrapper = await submitAndAdvanceToFirstPoll()

    expect(wrapper.text()).toContain('项目整体风险较低。')
    expect(wrapper.text()).toContain('数据版本')
    expect(wrapper.text()).toContain('9')
    expect(wrapper.find('[data-testid="agent-confirm"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Agent 操作失败')

    wrapper.unmount()
  })

  it('clears a transient polling error after the retry succeeds and loads the draft', async () => {
    mocks.getRun
      .mockRejectedValueOnce(new Error('temporary network failure'))
      .mockResolvedValueOnce(successfulRun)

    const wrapper = await submitAndAdvanceToFirstPoll()
    expect(wrapper.text()).toContain('Agent 状态查询失败。')

    vi.advanceTimersByTime(2000)
    await flushPromises()

    expect(wrapper.text()).not.toContain('Agent 操作失败')
    expect(wrapper.text()).toContain('项目整体风险较低。')
    expect(mocks.submitProjectRisk).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })
})
