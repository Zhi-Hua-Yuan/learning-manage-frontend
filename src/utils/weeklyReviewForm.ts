import type {
  NormalizedReviewVisibilityScope,
  WeeklyReviewDetail,
  WeeklyReviewSavePayload,
  WeeklyReviewUpdatePayload,
} from '@/types/review'
import { normalizeEntityId } from '@/types/normalization'

export const MAX_WEEKLY_REVIEW_TASKS = 500

export interface WeeklyReviewFormState {
  id: string | null
  year: number
  weekNo: number
  visibilityScope: NormalizedReviewVisibilityScope
  teamId: string | null
  focusProjectId: string | null
  reflection: string
  nextPlan: string
  sharedSummary: string
  taskIds: string[]
}

export type WeeklyReviewFormField =
  | 'id'
  | 'year'
  | 'weekNo'
  | 'visibilityScope'
  | 'teamId'
  | 'focusProjectId'
  | 'sharedSummary'
  | 'taskIds'

export type WeeklyReviewFormIssueCode =
  | 'SAVE_REQUIRES_DRAFT'
  | 'UPDATE_ID_REQUIRED'
  | 'INVALID_ID'
  | 'INVALID_YEAR'
  | 'INVALID_WEEK'
  | 'UNKNOWN_VISIBILITY'
  | 'TEAM_REQUIRED'
  | 'INVALID_TEAM_ID'
  | 'INVALID_FOCUS_PROJECT_ID'
  | 'SHARED_SUMMARY_REQUIRED'
  | 'INVALID_TASK_ID'
  | 'TASK_LIMIT_EXCEEDED'

export interface WeeklyReviewFormIssue {
  field: WeeklyReviewFormField
  code: WeeklyReviewFormIssueCode
}

export type WeeklyReviewFormBuildResult<T> =
  | { ok: true; payload: T }
  | { ok: false; issues: WeeklyReviewFormIssue[] }

export function createDefaultWeeklyReviewForm(year: number, weekNo: number): WeeklyReviewFormState {
  return {
    id: null,
    year,
    weekNo,
    visibilityScope: 'PRIVATE',
    teamId: null,
    focusProjectId: null,
    reflection: '',
    nextPlan: '',
    sharedSummary: '',
    taskIds: [],
  }
}

export function createWeeklyReviewFormFromDetail(detail: WeeklyReviewDetail): WeeklyReviewFormState {
  return {
    id: detail.id,
    year: detail.year,
    weekNo: detail.weekNo,
    visibilityScope: detail.visibilityScope,
    teamId: detail.teamId,
    focusProjectId: detail.focusProjectId,
    reflection: detail.reflection,
    nextPlan: detail.nextPlan,
    sharedSummary: detail.sharedSummary,
    taskIds: [...detail.taskIds],
  }
}

export function changeWeeklyReviewVisibility(
  form: WeeklyReviewFormState,
  visibilityScope: Exclude<NormalizedReviewVisibilityScope, 'UNKNOWN'>,
): WeeklyReviewFormState {
  if (form.visibilityScope === visibilityScope) return { ...form, taskIds: [...form.taskIds] }

  return {
    ...form,
    visibilityScope,
    teamId: null,
    focusProjectId: null,
    taskIds: [],
  }
}

export function changeWeeklyReviewTargetTeam(
  form: WeeklyReviewFormState,
  teamId: string | null,
): WeeklyReviewFormState {
  const normalizedTeamId = teamId === null ? null : normalizeEntityId(teamId)
  const nextTeamId = normalizedTeamId ?? null
  if (form.teamId === nextTeamId) return { ...form, taskIds: [...form.taskIds] }

  return {
    ...form,
    teamId: nextTeamId,
    focusProjectId: null,
    taskIds: [],
  }
}

export function invalidateWeeklyReviewTargetTeam(
  form: WeeklyReviewFormState,
): WeeklyReviewFormState {
  return {
    ...form,
    teamId: null,
    focusProjectId: null,
    taskIds: [],
  }
}

function uniqueTaskIds(taskIds: readonly string[]): { taskIds: string[]; hasInvalidId: boolean } {
  const normalized: string[] = []
  const seen = new Set<string>()
  let hasInvalidId = false

  for (const value of taskIds) {
    const taskId = normalizeEntityId(value)
    if (!taskId) {
      hasInvalidId = true
      continue
    }
    if (seen.has(taskId)) continue
    seen.add(taskId)
    normalized.push(taskId)
  }

  return { taskIds: normalized, hasInvalidId }
}

export function validateWeeklyReviewForm(form: WeeklyReviewFormState): WeeklyReviewFormIssue[] {
  const issues: WeeklyReviewFormIssue[] = []
  const normalizedTasks = uniqueTaskIds(form.taskIds)

  if (!Number.isSafeInteger(form.year) || form.year <= 0) {
    issues.push({ field: 'year', code: 'INVALID_YEAR' })
  }
  if (!Number.isSafeInteger(form.weekNo) || form.weekNo < 1 || form.weekNo > 53) {
    issues.push({ field: 'weekNo', code: 'INVALID_WEEK' })
  }
  if (form.visibilityScope === 'UNKNOWN') {
    issues.push({ field: 'visibilityScope', code: 'UNKNOWN_VISIBILITY' })
  }
  if (form.id !== null && !normalizeEntityId(form.id)) {
    issues.push({ field: 'id', code: 'INVALID_ID' })
  }
  if (form.focusProjectId !== null && !normalizeEntityId(form.focusProjectId)) {
    issues.push({ field: 'focusProjectId', code: 'INVALID_FOCUS_PROJECT_ID' })
  }
  if (form.visibilityScope === 'TEAM') {
    if (form.teamId === null) {
      issues.push({ field: 'teamId', code: 'TEAM_REQUIRED' })
    } else if (!normalizeEntityId(form.teamId)) {
      issues.push({ field: 'teamId', code: 'INVALID_TEAM_ID' })
    }
    if (!form.sharedSummary.trim()) {
      issues.push({ field: 'sharedSummary', code: 'SHARED_SUMMARY_REQUIRED' })
    }
  }
  if (normalizedTasks.hasInvalidId) {
    issues.push({ field: 'taskIds', code: 'INVALID_TASK_ID' })
  }
  if (normalizedTasks.taskIds.length > MAX_WEEKLY_REVIEW_TASKS) {
    issues.push({ field: 'taskIds', code: 'TASK_LIMIT_EXCEEDED' })
  }

  return issues
}

function buildMutationFields(form: WeeklyReviewFormState) {
  const normalizedTasks = uniqueTaskIds(form.taskIds).taskIds
  const visibilityScope: WeeklyReviewSavePayload['visibilityScope'] =
    form.visibilityScope === 'TEAM' ? 'TEAM' : 'PRIVATE'
  return {
    visibilityScope,
    teamId: form.visibilityScope === 'TEAM' ? normalizeEntityId(form.teamId) : null,
    focusProjectId: form.focusProjectId === null ? null : normalizeEntityId(form.focusProjectId),
    reflection: form.reflection,
    nextPlan: form.nextPlan,
    sharedSummary: form.visibilityScope === 'TEAM' ? form.sharedSummary.trim() : '',
    taskIds: normalizedTasks,
  }
}

export function buildWeeklyReviewSavePayload(
  form: WeeklyReviewFormState,
): WeeklyReviewFormBuildResult<WeeklyReviewSavePayload> {
  const issues = validateWeeklyReviewForm(form)
  const id = form.id === null ? null : normalizeEntityId(form.id)
  if (id) {
    issues.push({ field: 'id', code: 'SAVE_REQUIRES_DRAFT' })
  }
  if (issues.length > 0) return { ok: false, issues }

  return {
    ok: true,
    payload: {
      year: form.year,
      weekNo: form.weekNo,
      ...buildMutationFields(form),
    },
  }
}

export function buildWeeklyReviewUpdatePayload(
  form: WeeklyReviewFormState,
): WeeklyReviewFormBuildResult<WeeklyReviewUpdatePayload> {
  const issues = validateWeeklyReviewForm(form)
  const id = normalizeEntityId(form.id)
  if (form.id === null) {
    issues.push({ field: 'id', code: 'UPDATE_ID_REQUIRED' })
  }
  if (issues.length > 0 || !id) return { ok: false, issues }

  return {
    ok: true,
    payload: {
      id,
      ...buildMutationFields(form),
    },
  }
}
