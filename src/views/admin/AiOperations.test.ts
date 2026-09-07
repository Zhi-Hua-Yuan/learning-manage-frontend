import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  role: 'SYSTEM_ADMIN',
  replace: vi.fn(),
  overview: vi.fn(),
  runs: vi.fn(),
  failures: vi.fn(),
}))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return { ...actual, useRouter: () => ({ replace: mocks.replace }) }
})
vi.mock('@/stores/collaboration', () => ({
  useCollaborationStore: () => ({
    bootstrapCollaborationContext: vi.fn(async () => ({ currentUser: { role: mocks.role } })),
  }),
}))
vi.mock('@/api/ops', () => ({
  fetchOpsOverviewApi: mocks.overview,
  fetchCleanupRunsApi: mocks.runs,
  fetchCleanupRunApi: vi.fn(),
  fetchOpsFailuresApi: mocks.failures,
  submitCleanupApi: vi.fn(),
  cancelCleanupApi: vi.fn(),
}))

import AiOperations from '@/views/admin/AiOperations.vue'

describe('AiOperations', () => {
  beforeEach(() => {
    mocks.role = 'SYSTEM_ADMIN'
    mocks.replace.mockReset()
    mocks.overview.mockResolvedValue({
      ai: { totalCount: 4, p95DurationMs: 120 },
      rag: { totalCount: 2, p95DurationMs: 400 },
      agent: { totalCount: 1, p95DurationMs: 900 },
      dependencies: { chat: { name: 'chat', status: 'UP', detail: '<script>alert(1)</script>' } },
    })
    mocks.runs.mockResolvedValue({ records: [] })
    mocks.failures.mockResolvedValue({ records: [] })
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
})
