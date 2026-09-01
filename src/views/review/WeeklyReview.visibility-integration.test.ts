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

describe('WeeklyReview D2 visibility integration contract', () => {
  it('binds every editable visibility field to the isolated author form', () => {
    expect(weeklyReviewSource).toContain('<ReviewVisibilityFields')
    expect(weeklyReviewSource).toContain(':visibility-scope="reviewForm.visibilityScope"')
    expect(weeklyReviewSource).toContain(':team-id="reviewForm.teamId"')
    expect(weeklyReviewSource).toContain(':shared-summary="reviewForm.sharedSummary"')
    expect(weeklyReviewSource).toContain('v-model="reviewForm.reflection"')
    expect(weeklyReviewSource).not.toContain('v-model="currentReview.reflection"')
  })

  it('validates and fails closed before opening the confirmation dialog', () => {
    const openSaveModal = extractFunctionBlock('openSaveModal')

    expect(openSaveModal).toContain("reviewForm.value.visibilityScope === 'TEAM'")
    expect(openSaveModal).toContain("collaborationStore.teamsLoadState.status !== 'ready'")
    expect(openSaveModal).toContain('invalidateWeeklyReviewTargetTeam(reviewForm.value)')
    expect(openSaveModal).toContain('buildWeeklyReviewUpdatePayload(reviewForm.value)')
    expect(openSaveModal).toContain('buildWeeklyReviewSavePayload(reviewForm.value)')
    expect(openSaveModal).toMatch(/if \(!result\.ok\)[\s\S]*?return[\s\S]*?showSaveConfirmModal\.value = true/)
  })

  it('uses only the typed D2 mutation APIs and a validated payload snapshot', () => {
    const executeSave = extractFunctionBlock('executeSave')

    expect(weeklyReviewSource).not.toMatch(/\bsaveReviewApi\b/)
    expect(weeklyReviewSource).not.toMatch(/\bupdateReviewApi\b/)
    expect(executeSave).toContain('const mutation = pendingMutation.value')
    expect(executeSave).toContain('updateWeeklyReviewApi(mutation.payload)')
    expect(executeSave).toContain('saveWeeklyReviewApi(mutation.payload)')
    expect(executeSave).not.toContain('currentReview.value.completedTaskCount')
    expect(executeSave).not.toContain('currentReview.value.focusProjectName')
  })

  it('separates mutation success from the authoritative author-context refresh', () => {
    const executeSave = extractFunctionBlock('executeSave')
    const loadAuthorReviewContext = extractFunctionBlock('loadAuthorReviewContext')

    expect(loadAuthorReviewContext).toContain('normalizeCurrentWeeklyReviewWire(currentRes)')
    expect(loadAuthorReviewContext).toContain('normalizePersistedWeeklyReviewWire(review)')
    expect(loadAuthorReviewContext).toContain("throw new TypeError('Invalid weekly review history response')")
    expect(loadAuthorReviewContext).toContain('currentReview.value = normalizedCurrent')
    expect(loadAuthorReviewContext).toContain('reviewForm.value = createWeeklyReviewFormFromDetail(normalizedCurrent)')
    expect(loadAuthorReviewContext).toContain('historyReviews.value = normalizedHistory')
    expect(loadAuthorReviewContext).toContain('return true')
    expect(loadAuthorReviewContext).toContain('return false')

    expect(executeSave).toContain('const refreshed = await loadAuthorReviewContext()')
    expect(executeSave).toContain("toast.success('保存成功。')")
    expect(executeSave).toContain("toast.warning('保存已完成，但最新内容加载失败，请刷新页面后确认。', 5000)")
    expect(executeSave.indexOf('await updateWeeklyReviewApi(mutation.payload)'))
      .toBeLessThan(executeSave.indexOf('await loadAuthorReviewContext()'))
  })

  it('fails a lost TEAM target closed while preserving the author form', () => {
    const executeSave = extractFunctionBlock('executeSave')

    expect(executeSave).toContain("mutation.payload.visibilityScope === 'TEAM'")
    expect(executeSave).toContain("errorKind === 'PERMISSION_DENIED'")
    expect(executeSave).toContain("errorKind === 'NOT_FOUND'")
    expect(executeSave).toContain('collaborationStore.pruneTeamContext(lostTeamId)')
    expect(executeSave).toContain('invalidateWeeklyReviewTargetTeam(reviewForm.value)')
    expect(executeSave).toContain("{ field: 'teamId', code: 'TEAM_REQUIRED' }")
  })

  it('states the effective visibility in the final confirmation', () => {
    expect(weeklyReviewSource).toContain('确认保存为私人复盘？')
    expect(weeklyReviewSource).toContain('本周复盘仅你自己可见，不会出现在团队动态中。')
    expect(weeklyReviewSource).toContain('保存并共享摘要')
    expect(weeklyReviewSource).toContain('仅共享单独填写的摘要。本周复盘、下周计划和关联任务仍然只有你自己可见。')
  })
})
