import { describe, expect, it } from 'vitest'

import weeklyReviewSource from './WeeklyReview.vue?raw'

const extractFunctionBlock = (functionName: string) => {
  const declarationStart = weeklyReviewSource.indexOf(`const ${functionName} =`)
  if (declarationStart < 0) throw new Error(`Missing ${functionName} declaration`)

  const arrowStart = weeklyReviewSource.indexOf('=>', declarationStart)
  const blockStart = weeklyReviewSource.indexOf('{', arrowStart)
  if (arrowStart < 0 || blockStart < 0) throw new Error(`Missing ${functionName} block`)

  let depth = 0
  for (let index = blockStart; index < weeklyReviewSource.length; index += 1) {
    const character = weeklyReviewSource[index]
    if (character === '{') depth += 1
    if (character === '}') {
      depth -= 1
      if (depth === 0) return weeklyReviewSource.slice(declarationStart, index + 1)
    }
  }

  throw new Error(`Unclosed ${functionName} block`)
}

describe('WeeklyReview D4-2 server statistics contract', () => {
  it('keeps completed-task and focus-project facts read-only after normalization (PR7-T-038)', () => {
    expect(weeklyReviewSource).not.toMatch(/currentReview\.value\.completedTaskCount\s*=/)
    expect(weeklyReviewSource).not.toMatch(/currentReview\.value\.focusProjectName\s*=/)

    const summaryCards = extractFunctionBlock('summaryCards')
    expect(summaryCards).toContain('authoritativeCompletedTaskSummary.value.currentCompletedTaskCount')
    expect(summaryCards).toContain('previousAuthoritativeCompletedTaskCount')
    expect(summaryCards).not.toContain('metric.completedCount')
  })

  it('calculates auxiliary rates only from a complete personal and team snapshot', () => {
    const hydrateSummaryMetrics = extractFunctionBlock('hydrateSummaryMetrics')
    expect(hydrateSummaryMetrics).toContain('collaborationStore.currentUser?.id')
    expect(hydrateSummaryMetrics).toContain('collaborationStore.teams.map((team) => team.id)')
    expect(hydrateSummaryMetrics).toContain('loadWeeklyReviewTaskSnapshot')
    expect(hydrateSummaryMetrics).toContain('createSummaryMetrics(snapshot.tasks, actorId, startDate, endDate)')
    expect(hydrateSummaryMetrics.indexOf('collaborationStore.currentUser?.id'))
      .toBeLessThan(hydrateSummaryMetrics.indexOf('loadWeeklyReviewTaskSnapshot'))
  })

  it('fails auxiliary metrics closed for partial or malformed task data', () => {
    const hydrateSummaryMetrics = extractFunctionBlock('hydrateSummaryMetrics')
    expect(hydrateSummaryMetrics).toContain('if (!snapshot.complete)')
    expect(hydrateSummaryMetrics).toContain('summaryMetrics.value = createSummaryPlaceholder()')
    expect(hydrateSummaryMetrics).toContain('summaryReady.value = false')
    expect(hydrateSummaryMetrics).toContain('weeklyTaskSnapshot.value = []')
    expect(hydrateSummaryMetrics).toContain('weeklyTaskSnapshotComplete.value = false')
  })

  it('separates the D4-3 AI context resolver from the auxiliary metric calculator', () => {
    const createSummaryMetrics = extractFunctionBlock('createSummaryMetrics')
    const handleAiPolish = extractFunctionBlock('handleAiPolish')

    expect(createSummaryMetrics).not.toContain('resolveWeeklyPolishTaskContext')
    expect(handleAiPolish).toContain('resolveWeeklyPolishTaskContext')
    expect(handleAiPolish).toContain('selectedTaskIds: reviewForm.value.taskIds')
    expect(weeklyReviewSource).not.toContain('weeklyCompletedTaskIds')
    expect(weeklyReviewSource).not.toContain('updateLegacyAiTaskCandidates')
  })

  it('guards late auxiliary responses by review, actor, session and team snapshot', () => {
    const hydrateSummaryMetrics = extractFunctionBlock('hydrateSummaryMetrics')
    expect(hydrateSummaryMetrics).toContain('requestEpoch === summaryRequestEpoch')
    expect(hydrateSummaryMetrics).toContain('reviewKey === getSummaryReviewKey()')
    expect(hydrateSummaryMetrics).toContain('collaborationStore.currentUser?.id === actorId')
    expect(hydrateSummaryMetrics).toContain('collaborationStore.sessionEpoch === actorSessionEpoch')
    expect(hydrateSummaryMetrics).toContain("collaborationStore.teams.map((team) => team.id).join(',') === teamSnapshotKey")
    expect(hydrateSummaryMetrics).toContain('if (!isRequestActive()) return')
  })

  it('loads server-authoritative author facts without requiring collaboration bootstrap', () => {
    const loadAuthorReviewContext = extractFunctionBlock('loadAuthorReviewContext')

    expect(loadAuthorReviewContext).toContain('fetchCurrentReview()')
    expect(loadAuthorReviewContext).toContain('fetchReviewHistory()')
    expect(loadAuthorReviewContext).not.toContain('bootstrapCollaborationContext')
    expect(loadAuthorReviewContext).toContain('actorIdentity === getActorContextIdentity()')
  })

  it('resets all derived state before switching to a historical author review', () => {
    const switchAuthorReviewContext = extractFunctionBlock('switchAuthorReviewContext')
    const handleEditReview = extractFunctionBlock('handleEditReview')

    expect(switchAuthorReviewContext).toContain('resetSummaryDerivedState()')
    expect(switchAuthorReviewContext).toContain('createWeeklyReviewFormFromDetail(review)')
    expect(switchAuthorReviewContext).toContain('await activateAssociationContext()')
    expect(switchAuthorReviewContext).toContain('switchEpoch !== summaryRequestEpoch')
    expect(switchAuthorReviewContext).toContain('await hydrateSummaryMetrics()')
    expect(handleEditReview).toContain('switchAuthorReviewContext(review)')
    expect(handleEditReview).not.toContain('currentReview.value =')
  })
})
