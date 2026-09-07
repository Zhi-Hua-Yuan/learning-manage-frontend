import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  role: 'SYSTEM_ADMIN',
  replace: vi.fn(),
  userMe: vi.fn(),
  overview: vi.fn(),
  runs: vi.fn(),
  detail: vi.fn(),
  failures: vi.fn(),
  submit: vi.fn(),
}))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return { ...actual, useRouter: () => ({ replace: mocks.replace }) }
})
vi.mock('@/api/user', () => ({ getUserMeApi: mocks.userMe }))
vi.mock('@/api/ops', () => ({
  fetchOpsOverviewApi: mocks.overview,
  fetchCleanupRunsApi: mocks.runs,
  fetchCleanupRunApi: mocks.detail,
  fetchOpsFailuresApi: mocks.failures,
  submitCleanupApi: mocks.submit,
  cancelCleanupApi: vi.fn(),
}))

import AiOperations from '@/views/admin/AiOperations.vue'

const run = (runId: string, dryRun = true, status = 'SUCCEEDED') => ({
  runId,
  clientRequestId: `${runId}-request`,
  triggerType: 'MANUAL',
  policyVersion: 'stage7-v1',
  dryRun,
  status,
  scannedCount: 1,
  estimatedCount: 1,
  affectedCount: 0,
  failureCount: 0,
  errorSummary: null,
  traceId: 'trace',
  startedAt: null,
  finishedAt: '2026-09-07T00:00:00',
  createTime: '2026-09-07T00:00:00',
  idempotentReplay: false,
  items: [],
})

describe('AiOperations', () => {
  beforeEach(() => {
    vi.useRealTimers()
    mocks.role = 'SYSTEM_ADMIN'
    Object.values(mocks).forEach((value) => {
      if (typeof value === 'function' && 'mockReset' in value) value.mockReset()
    })
    mocks.userMe.mockImplementation(async () => ({
      id: '1', account: 'admin', username: 'Admin', userRole: mocks.role,
    }))
    mocks.overview.mockResolvedValue({
      from: '2026-09-06T00:00:00',
      to: '2026-09-07T00:00:00',
      ai: { totalCount: 4, p95DurationMs: 120 },
      rag: { totalCount: 2, p95DurationMs: 400 },
      agent: { totalCount: 1, p95DurationMs: 900 },
      dependencies: { chat: { name: 'chat', status: 'UP', detail: '<script>alert(1)</script>' } },
    })
    mocks.runs.mockResolvedValue({ records: [] })
    mocks.detail.mockResolvedValue(null)
    mocks.failures.mockResolvedValue({ records: [] })
    mocks.submit.mockResolvedValue({})
  })

  it('renders sanitized metadata for a system administrator', async () => {
    const wrapper = mount(AiOperations)
    await flushPromises()
    expect(wrapper.text()).toContain('AI 生产运维')
    expect(wrapper.text()).toContain('<script>alert(1)</script>')
    expect(wrapper.find('script').exists()).toBe(false)
    expect(mocks.overview).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('redirects a non-admin without querying operations data', async () => {
    mocks.role = 'USER'
    const wrapper = mount(AiOperations)
    await flushPromises()
    expect(mocks.replace).toHaveBeenCalledWith('/tasks')
    expect(mocks.overview).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('binds a formal cleanup to the explicitly selected successful dry run', async () => {
    const preview = run('cleanup_1234567890abcdef')
    mocks.runs.mockResolvedValue({ records: [preview] })
    mocks.detail.mockResolvedValue(preview)
    const wrapper = mount(AiOperations)
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()

    const formalButton = wrapper.findAll('button').find((button) => button.text() === '正式清理')
    expect(formalButton?.attributes('disabled')).toBeUndefined()
    await formalButton?.trigger('click')
    await flushPromises()

    expect(mocks.submit).toHaveBeenCalledWith(
      false,
      expect.stringMatching(/^ops-run-/),
      preview.runId,
    )
    wrapper.unmount()
  })

  it('discards a stale run detail response after a newer selection', async () => {
    const first = run('cleanup_aaaaaaaaaaaaaaaa')
    const second = run('cleanup_bbbbbbbbbbbbbbbb')
    let resolveFirst!: (value: ReturnType<typeof run>) => void
    let resolveSecond!: (value: ReturnType<typeof run>) => void
    const firstPromise = new Promise<ReturnType<typeof run>>((resolve) => { resolveFirst = resolve })
    const secondPromise = new Promise<ReturnType<typeof run>>((resolve) => { resolveSecond = resolve })
    mocks.runs.mockResolvedValue({ records: [first, second] })
    mocks.detail.mockImplementation((runId: string) => runId === first.runId ? firstPromise : secondPromise)
    const wrapper = mount(AiOperations)
    await flushPromises()
    const rows = wrapper.findAll('tbody tr')
    await rows[0]!.trigger('click')
    await rows[1]!.trigger('click')
    resolveSecond(second)
    await flushPromises()
    resolveFirst(first)
    await flushPromises()

    expect(wrapper.text()).toContain(`运行详情 · ${second.runId}`)
    expect(wrapper.text()).not.toContain(`运行详情 · ${first.runId}`)
    wrapper.unmount()
  })

  it('does not install polling after the view is unmounted during loading', async () => {
    vi.useFakeTimers()
    let resolveOverview!: (value: Record<string, unknown>) => void
    mocks.overview.mockImplementation(() => new Promise((resolve) => { resolveOverview = resolve }))
    const wrapper = mount(AiOperations)
    await flushPromises()
    expect(mocks.overview).toHaveBeenCalledTimes(1)
    wrapper.unmount()
    resolveOverview({ ai: {}, rag: {}, agent: {}, dependencies: {}, knowledgeQueue: {} })
    await flushPromises()
    await vi.advanceTimersByTimeAsync(6000)

    expect(mocks.overview).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('ignores an older dashboard refresh that resolves after a newer one', async () => {
    vi.useFakeTimers()
    mocks.runs.mockResolvedValue({ records: [run('cleanup_pending_refresh', true, 'PENDING')] })
    const wrapper = mount(AiOperations)
    await flushPromises()
    let resolveOlder!: (value: Record<string, unknown>) => void
    let resolveNewer!: (value: Record<string, unknown>) => void
    mocks.overview
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOlder = resolve }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveNewer = resolve }))

    await vi.advanceTimersByTimeAsync(5000)
    await vi.advanceTimersByTimeAsync(5000)
    resolveNewer({
      from: '2026-09-06T00:00:00', to: '2026-09-07T00:00:00',
      ai: { totalCount: 22 }, rag: { totalCount: 0 }, agent: { totalCount: 0 },
      dependencies: {}, knowledgeQueue: {},
    })
    await flushPromises()
    resolveOlder({
      from: '2026-09-06T00:00:00', to: '2026-09-07T00:00:00',
      ai: { totalCount: 11 }, rag: { totalCount: 0 }, agent: { totalCount: 0 },
      dependencies: {}, knowledgeQueue: {},
    })
    await flushPromises()

    const aiCard = wrapper.findAll('section')[0]!.findAll('article')[0]!
    expect(aiCard.text()).toContain('22')
    expect(aiCard.text()).not.toContain('11')
    wrapper.unmount()
    vi.useRealTimers()
  })
})
