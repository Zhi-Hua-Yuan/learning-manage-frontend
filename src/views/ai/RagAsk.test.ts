import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  ask: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
  readProject: vi.fn(),
  writeProject: vi.fn(),
}))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return {
    ...actual,
    useRoute: () => ({ query: {} }),
    useRouter: () => ({ replace: mocks.replace, push: mocks.push }),
  }
})

vi.mock('@/api/ai', () => ({ ragAskApi: mocks.ask }))

vi.mock('@/utils/appCache', () => ({
  readSelectedProjectIdCache: mocks.readProject,
  writeSelectedProjectIdCache: mocks.writeProject,
}))

import RagAsk from '@/views/ai/RagAsk.vue'

describe('RagAsk', () => {
  beforeEach(() => {
    mocks.readProject.mockReturnValue('10')
    mocks.ask.mockResolvedValue({
      requestId: 'request-1',
      status: 'ACTIVE',
      answer: '<script>alert(1)</script>结论 [S1]',
      insufficientEvidence: false,
      degraded: false,
      degradationReason: null,
      knowledgeAsOf: '2026-09-06T12:00:00',
      sources: [{
        citationId: 'S1',
        sourceType: 'TASK',
        sourceId: '20',
        title: '<img src=x onerror=alert(1)>任务',
        score: 0.9,
        vectorScore: 0.8,
        rerankScore: 0.9,
        updatedAt: null,
      }],
    })
  })

  it('submits the selected project and renders hostile AI text inertly', async () => {
    const wrapper = mount(RagAsk)
    await wrapper.get('[data-testid="rag-question"]').setValue('为什么延期')
    await wrapper.get('[data-testid="rag-submit"]').trigger('click')
    await flushPromises()

    expect(mocks.ask).toHaveBeenCalledWith({ projectId: '10', question: '为什么延期' })
    expect(wrapper.get('[data-testid="rag-answer"]').text()).toContain('<script>alert(1)</script>')
    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.find('img[src="x"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('<img src=x onerror=alert(1)>任务')
    expect(mocks.writeProject).toHaveBeenCalledWith('10')
  })

  it('opens task citations through the existing task route', async () => {
    const wrapper = mount(RagAsk)
    await wrapper.get('[data-testid="rag-question"]').setValue('为什么延期')
    await wrapper.get('[data-testid="rag-submit"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="rag-source"]').trigger('click')

    expect(mocks.push).toHaveBeenCalledWith({
      path: '/tasks',
      query: { projectId: '10', taskId: '20' },
    })
  })
})
