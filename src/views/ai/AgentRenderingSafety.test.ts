import { describe, expect, it } from 'vitest'
import agentWorkbenchSource from './AgentWorkbench.vue?raw'
import reportDetailSource from './AnalysisReportDetail.vue?raw'
import taskListSource from '../task/TaskList.vue?raw'
import weeklyReviewSource from '../review/WeeklyReview.vue?raw'

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

  it('keeps polling recoverable and cancellation generation-fenced', () => {
    expect(agentWorkbenchSource).toContain('pollGeneration')
    expect(agentWorkbenchSource).toContain('schedulePoll(generation)')
    expect(agentWorkbenchSource).toContain('generation !== pollGeneration')
    expect(agentWorkbenchSource).toContain("resolveAiErrorPresentation(error, 'Agent 状态查询失败。')")
  })

  it('paginates reports and consumes citation target identifiers', () => {
    expect(agentWorkbenchSource).toContain('reportPages > 1')
    expect(agentWorkbenchSource).toContain('loadReports(reportPage + 1)')
    expect(reportDetailSource).toContain('taskId: String(source.sourceId)')
    expect(reportDetailSource).toContain('reviewId: String(source.sourceId)')
    expect(taskListSource).toContain('route.query.taskId')
    expect(taskListSource).toContain('focusTaskFromRoute()')
    expect(weeklyReviewSource).toContain('currentRoute.value.query?.reviewId')
    expect(weeklyReviewSource).toContain('await viewDetail(reviewId)')
  })
})
