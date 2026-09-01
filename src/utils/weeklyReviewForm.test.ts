import { describe, expect, it } from 'vitest'
import type { WeeklyReviewDetail } from '@/types/review'
import {
  MAX_WEEKLY_REVIEW_TASKS,
  buildWeeklyReviewSavePayload,
  buildWeeklyReviewUpdatePayload,
  changeWeeklyReviewTargetTeam,
  changeWeeklyReviewVisibility,
  createDefaultWeeklyReviewForm,
  createWeeklyReviewFormFromDetail,
  invalidateWeeklyReviewTargetTeam,
  validateWeeklyReviewForm,
} from './weeklyReviewForm'

const detailFixture = (): WeeklyReviewDetail => ({
  id: '31',
  authorUserId: '2',
  year: 2026,
  weekNo: 36,
  startDate: '2026-08-31',
  endDate: '2026-09-06',
  completedTaskCount: 4,
  visibilityScope: 'TEAM',
  teamId: '7',
  focusProjectId: '9',
  focusProjectName: 'Server project name',
  sharedSummary: ' Shared summary ',
  reflection: 'Private reflection',
  nextPlan: 'Private next plan',
  taskIds: ['11', '12'],
  createTime: '2026-09-01T08:00:00',
  updateTime: '2026-09-01T09:00:00',
})

describe('weekly review form domain', () => {
  it('creates a new review as PRIVATE by default', () => {
    expect(createDefaultWeeklyReviewForm(2026, 36)).toEqual({
      id: null,
      year: 2026,
      weekNo: 36,
      visibilityScope: 'PRIVATE',
      teamId: null,
      focusProjectId: null,
      reflection: '',
      nextPlan: '',
      sharedSummary: '',
      taskIds: [],
    })
  })

  it('builds a PRIVATE save payload with an explicit null team and no published summary', () => {
    const form = {
      ...createDefaultWeeklyReviewForm(2026, 36),
      teamId: '7',
      sharedSummary: 'retain only as a local draft',
      reflection: 'Private reflection',
      taskIds: ['11', '11', '12'],
    }

    expect(buildWeeklyReviewSavePayload(form)).toEqual({
      ok: true,
      payload: {
        year: 2026,
        weekNo: 36,
        visibilityScope: 'PRIVATE',
        teamId: null,
        focusProjectId: null,
        reflection: 'Private reflection',
        nextPlan: '',
        sharedSummary: '',
        taskIds: ['11', '12'],
      },
    })
    expect(form.sharedSummary).toBe('retain only as a local draft')
  })

  it('requires a valid team and a nonblank shared summary for TEAM', () => {
    const form = {
      ...createDefaultWeeklyReviewForm(2026, 36),
      visibilityScope: 'TEAM' as const,
      sharedSummary: '   ',
    }

    expect(validateWeeklyReviewForm(form)).toEqual(expect.arrayContaining([
      { field: 'teamId', code: 'TEAM_REQUIRED' },
      { field: 'sharedSummary', code: 'SHARED_SUMMARY_REQUIRED' },
    ]))
  })

  it('trims a TEAM summary when constructing the canonical payload', () => {
    const result = buildWeeklyReviewSavePayload({
      ...createDefaultWeeklyReviewForm(2026, 36),
      visibilityScope: 'TEAM',
      teamId: '7',
      sharedSummary: '  Shared summary  ',
    })

    expect(result).toMatchObject({
      ok: true,
      payload: { visibilityScope: 'TEAM', teamId: '7', sharedSummary: 'Shared summary' },
    })
  })

  it('allows 500 unique task IDs and blocks the 501st without truncating input', () => {
    const fiveHundred = Array.from({ length: MAX_WEEKLY_REVIEW_TASKS }, (_, index) => String(index + 1))
    const allowed = {
      ...createDefaultWeeklyReviewForm(2026, 36),
      taskIds: fiveHundred,
    }
    expect(validateWeeklyReviewForm(allowed)).not.toContainEqual({
      field: 'taskIds',
      code: 'TASK_LIMIT_EXCEEDED',
    })

    const oversized = { ...allowed, taskIds: [...fiveHundred, '501'] }
    expect(validateWeeklyReviewForm(oversized)).toContainEqual({
      field: 'taskIds',
      code: 'TASK_LIMIT_EXCEEDED',
    })
    expect(oversized.taskIds).toHaveLength(501)
  })

  it('rejects malformed IDs and an unknown visibility scope', () => {
    const issues = validateWeeklyReviewForm({
      ...createDefaultWeeklyReviewForm(2026, 36),
      visibilityScope: 'UNKNOWN',
      focusProjectId: 'invalid',
      taskIds: ['11', 'invalid'],
    })

    expect(issues).toEqual(expect.arrayContaining([
      { field: 'visibilityScope', code: 'UNKNOWN_VISIBILITY' },
      { field: 'focusProjectId', code: 'INVALID_FOCUS_PROJECT_ID' },
      { field: 'taskIds', code: 'INVALID_TASK_ID' },
    ]))
  })

  it('creates an independent form with only editable author fields', () => {
    const detail = detailFixture()
    const form = createWeeklyReviewFormFromDetail(detail)

    expect(form).toEqual({
      id: '31',
      year: 2026,
      weekNo: 36,
      visibilityScope: 'TEAM',
      teamId: '7',
      focusProjectId: '9',
      reflection: 'Private reflection',
      nextPlan: 'Private next plan',
      sharedSummary: ' Shared summary ',
      taskIds: ['11', '12'],
    })
    expect(form).not.toHaveProperty('completedTaskCount')
    expect(form).not.toHaveProperty('focusProjectName')
    form.taskIds.push('13')
    expect(detail.taskIds).toEqual(['11', '12'])
  })

  it('whitelists an update payload and excludes save-only and server-derived fields', () => {
    const result = buildWeeklyReviewUpdatePayload(createWeeklyReviewFormFromDetail(detailFixture()))
    expect(result).toEqual({
      ok: true,
      payload: {
        id: '31',
        visibilityScope: 'TEAM',
        teamId: '7',
        focusProjectId: '9',
        reflection: 'Private reflection',
        nextPlan: 'Private next plan',
        sharedSummary: 'Shared summary',
        taskIds: ['11', '12'],
      },
    })
    if (!result.ok) throw new Error('expected a valid update payload')
    expect(result.payload).not.toHaveProperty('year')
    expect(result.payload).not.toHaveProperty('weekNo')
    expect(result.payload).not.toHaveProperty('completedTaskCount')
    expect(result.payload).not.toHaveProperty('focusProjectName')
    expect(result.payload).not.toHaveProperty('authorUserId')
    expect(result.payload).not.toHaveProperty('startDate')
    expect(result.payload).not.toHaveProperty('endDate')
  })

  it('enforces save and update identity modes', () => {
    const persisted = createWeeklyReviewFormFromDetail(detailFixture())
    expect(buildWeeklyReviewSavePayload(persisted)).toEqual({
      ok: false,
      issues: [{ field: 'id', code: 'SAVE_REQUIRES_DRAFT' }],
    })
    expect(buildWeeklyReviewUpdatePayload(createDefaultWeeklyReviewForm(2026, 36))).toEqual({
      ok: false,
      issues: [{ field: 'id', code: 'UPDATE_ID_REQUIRED' }],
    })

    const invalid = { ...createDefaultWeeklyReviewForm(2026, 36), id: 'invalid-id' }
    expect(buildWeeklyReviewSavePayload(invalid)).toEqual({
      ok: false,
      issues: [{ field: 'id', code: 'INVALID_ID' }],
    })
    expect(buildWeeklyReviewUpdatePayload(invalid)).toEqual({
      ok: false,
      issues: [{ field: 'id', code: 'INVALID_ID' }],
    })
  })

  it('rejects invalid year and week boundaries', () => {
    expect(validateWeeklyReviewForm(createDefaultWeeklyReviewForm(0, 54))).toEqual(expect.arrayContaining([
      { field: 'year', code: 'INVALID_YEAR' },
      { field: 'weekNo', code: 'INVALID_WEEK' },
    ]))
  })

  it('clears scoped associations when entering TEAM and preserves private drafts', () => {
    const original = {
      ...createDefaultWeeklyReviewForm(2026, 36),
      teamId: '7',
      focusProjectId: '9',
      taskIds: ['11', '12'],
      reflection: 'Private reflection',
      nextPlan: 'Private next plan',
      sharedSummary: 'Shared draft',
    }

    const changed = changeWeeklyReviewVisibility(original, 'TEAM')
    expect(changed).toMatchObject({
      visibilityScope: 'TEAM',
      teamId: null,
      focusProjectId: null,
      taskIds: [],
      reflection: 'Private reflection',
      nextPlan: 'Private next plan',
      sharedSummary: 'Shared draft',
    })
    expect(original).toMatchObject({
      visibilityScope: 'PRIVATE',
      teamId: '7',
      focusProjectId: '9',
      taskIds: ['11', '12'],
    })
  })

  it('clears the TEAM target when returning to PRIVATE but keeps the unpublished summary draft', () => {
    const changed = changeWeeklyReviewVisibility({
      ...createDefaultWeeklyReviewForm(2026, 36),
      visibilityScope: 'TEAM',
      teamId: '7',
      focusProjectId: '9',
      taskIds: ['11'],
      sharedSummary: 'Keep locally',
    }, 'PRIVATE')

    expect(changed).toMatchObject({
      visibilityScope: 'PRIVATE',
      teamId: null,
      focusProjectId: null,
      taskIds: [],
      sharedSummary: 'Keep locally',
    })
    expect(buildWeeklyReviewSavePayload(changed)).toMatchObject({
      ok: true,
      payload: { teamId: null, sharedSummary: '' },
    })
  })

  it('clears associations only when the TEAM target actually changes', () => {
    const original = {
      ...createDefaultWeeklyReviewForm(2026, 36),
      visibilityScope: 'TEAM' as const,
      teamId: '7',
      focusProjectId: '9',
      taskIds: ['11'],
    }

    expect(changeWeeklyReviewTargetTeam(original, '8')).toMatchObject({
      teamId: '8',
      focusProjectId: null,
      taskIds: [],
    })
    expect(changeWeeklyReviewTargetTeam(original, '7')).toMatchObject({
      teamId: '7',
      focusProjectId: '9',
      taskIds: ['11'],
    })
  })

  it('fails a lost TEAM target closed without discarding authored text', () => {
    const invalidated = invalidateWeeklyReviewTargetTeam({
      ...createDefaultWeeklyReviewForm(2026, 36),
      visibilityScope: 'TEAM',
      teamId: '7',
      focusProjectId: '9',
      taskIds: ['11'],
      reflection: 'Private reflection',
      nextPlan: 'Private next plan',
      sharedSummary: 'Shared draft',
    })

    expect(invalidated).toMatchObject({
      visibilityScope: 'TEAM',
      teamId: null,
      focusProjectId: null,
      taskIds: [],
      reflection: 'Private reflection',
      nextPlan: 'Private next plan',
      sharedSummary: 'Shared draft',
    })
    expect(validateWeeklyReviewForm(invalidated)).toContainEqual({
      field: 'teamId',
      code: 'TEAM_REQUIRED',
    })
  })
})
