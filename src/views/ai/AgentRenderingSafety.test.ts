import { describe, expect, it } from 'vitest'
import agentWorkbenchSource from './AgentWorkbench.vue?raw'
import reportDetailSource from './AnalysisReportDetail.vue?raw'

describe('Stage 6 Agent rendering safety', () => {
  it('renders AI and source text through SafeAiText without raw HTML', () => {
    for (const source of [agentWorkbenchSource, reportDetailSource]) {
      expect(source).toContain('SafeAiText')
      expect(source).not.toContain('v-html')
      expect(source).not.toContain('innerHTML')
    }
  })

  it('does not persist Agent report or run payloads to browser storage', () => {
    expect(agentWorkbenchSource).not.toContain('localStorage')
    expect(agentWorkbenchSource).not.toContain('sessionStorage')
  })
})
