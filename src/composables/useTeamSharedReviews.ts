import { computed, readonly, ref } from 'vue'

import { fetchTeamSharedReviewsApi, type TeamSharedReviewParams } from '@/api/review'
import type { EntityId, PageResult, WirePage } from '@/types/common'
import { normalizeEntityId, normalizeSharedWeeklyReviewPage } from '@/types/normalization'
import type { SharedWeeklyReview, SharedWeeklyReviewWire } from '@/types/review'
import { useCollaborationStore } from '@/stores/collaboration'
import { classifyApiError, type ApiErrorKind } from '@/utils/request'

export const TEAM_SHARED_REVIEW_DEFAULT_SIZE = 20

export type TeamSharedReviewPhase =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'refreshing'
  | 'loading-more'
  | 'error'
  | 'refresh-error'
  | 'load-more-error'
  | 'forbidden'
  | 'not-found'
  | 'authentication-required'

export type TeamSharedReviewOutcome =
  | { kind: 'success' }
  | { kind: 'error'; errorKind: ApiErrorKind }
  | { kind: 'ignored' }
  | { kind: 'stale' }

export interface TeamSharedReviewCollaborationSource {
  currentUser: { id: string } | null
  sessionEpoch: number
  getTeam?: (teamId: EntityId) => unknown
  pruneTeamContext?: (teamId: EntityId) => void
  refreshMyTeams?: () => Promise<unknown>
}

export interface TeamSharedReviewDependencies {
  fetchReviews?: (params: TeamSharedReviewParams) => Promise<WirePage<SharedWeeklyReviewWire>>
  collaboration?: TeamSharedReviewCollaborationSource
  pageSize?: number
}

interface RequestSnapshot {
  revision: number
  teamId: string
  actorId: string
  sessionEpoch: number
}

const ERROR_MESSAGES: Record<ApiErrorKind, string> = {
  AUTHENTICATION_REQUIRED: '登录状态已失效，请重新登录。',
  PERMISSION_DENIED: '你已无权查看该团队动态，团队列表已刷新。',
  CONFLICT: '团队动态已发生变化，请重新加载。',
  VALIDATION: '团队参数无效，请重新选择团队。',
  NOT_FOUND: '该团队或共享复盘已失效。',
  SERVER: '团队动态暂时无法加载，请稍后重试。',
  NETWORK: '网络异常，请检查网络后重试。',
  UNKNOWN: '团队动态数据无法确认，请重新加载。',
}

const phaseForTerminalError = (kind: ApiErrorKind): TeamSharedReviewPhase => {
  if (kind === 'PERMISSION_DENIED') return 'forbidden'
  if (kind === 'NOT_FOUND') return 'not-found'
  if (kind === 'AUTHENTICATION_REQUIRED') return 'authentication-required'
  return 'error'
}

const uniqueById = (values: readonly SharedWeeklyReview[]) => {
  const seen = new Set<string>()
  return values.filter((value) => {
    if (seen.has(value.id)) return false
    seen.add(value.id)
    return true
  })
}

/**
 * Merge a later page while preserving first-seen order. If a page overlaps
 * due to concurrent writes, the later response replaces the old value.
 */
export const mergeSharedWeeklyReviews = (
  existing: readonly SharedWeeklyReview[],
  incoming: readonly SharedWeeklyReview[],
) => {
  const result = uniqueById(existing)
  const indexById = new Map(result.map((review, index) => [review.id, index]))

  for (const review of incoming) {
    const index = indexById.get(review.id)
    if (index === undefined) {
      indexById.set(review.id, result.length)
      result.push(review)
    } else {
      result[index] = review
    }
  }

  return result
}

const isBusyPhase = (phase: TeamSharedReviewPhase) =>
  phase === 'loading' || phase === 'refreshing' || phase === 'loading-more'

export function useTeamSharedReviews(dependencies: TeamSharedReviewDependencies = {}) {
  const fetchReviews = dependencies.fetchReviews ?? fetchTeamSharedReviewsApi
  const pageSize = dependencies.pageSize ?? TEAM_SHARED_REVIEW_DEFAULT_SIZE
  let collaboration = dependencies.collaboration

  const getCollaboration = () => {
    collaboration ??= useCollaborationStore()
    return collaboration
  }

  const activeTeamId = ref<string | null>(null)
  const records = ref<SharedWeeklyReview[]>([])
  const current = ref(0)
  const size = ref(pageSize)
  const total = ref(0)
  const phase = ref<TeamSharedReviewPhase>('idle')
  const errorKind = ref<ApiErrorKind | null>(null)
  const errorMessage = ref<string | null>(null)
  let requestRevision = 0

  const busy = computed(() => isBusyPhase(phase.value))
  const hasMore = computed(() => current.value > 0 && current.value * size.value < total.value)

  const clearError = () => {
    errorKind.value = null
    errorMessage.value = null
  }

  const clearRecords = () => {
    records.value = []
    current.value = 0
    total.value = 0
    size.value = pageSize
  }

  const isTeamAvailable = (teamId: string) => {
    const source = getCollaboration()
    return source.getTeam ? Boolean(source.getTeam(teamId)) : true
  }

  const isRequestActive = (snapshot: RequestSnapshot) => {
    const source = getCollaboration()
    return (
      requestRevision === snapshot.revision &&
      activeTeamId.value === snapshot.teamId &&
      source.currentUser?.id === snapshot.actorId &&
      source.sessionEpoch === snapshot.sessionEpoch &&
      isTeamAvailable(snapshot.teamId)
    )
  }

  const setError = (kind: ApiErrorKind, terminal = false) => {
    errorKind.value = kind
    errorMessage.value = ERROR_MESSAGES[kind]
    if (terminal) {
      phase.value = phaseForTerminalError(kind)
    }
  }

  const clearForAuthentication = () => {
    requestRevision += 1
    activeTeamId.value = null
    clearRecords()
    setError('AUTHENTICATION_REQUIRED', true)
  }

  const clearForScopedAccess = async (
    snapshot: RequestSnapshot,
    kind: 'PERMISSION_DENIED' | 'NOT_FOUND',
  ): Promise<TeamSharedReviewOutcome> => {
    if (!isRequestActive(snapshot)) return { kind: 'stale' }

    // Clear sensitive page state before doing any recovery request.
    requestRevision += 1
    activeTeamId.value = null
    clearRecords()
    setError(kind, true)

    const source = getCollaboration()
    try {
      source.pruneTeamContext?.(snapshot.teamId)
    } catch {
      // The page state is already cleared; recovery is best effort.
    }
    try {
      await source.refreshMyTeams?.()
    } catch {
      // Do not restore the old team or old records if refresh fails.
    }

    return { kind: 'error', errorKind: kind }
  }

  const handleRequestError = async (
    error: unknown,
    snapshot: RequestSnapshot,
    mode: 'initial' | 'refresh' | 'more',
  ): Promise<TeamSharedReviewOutcome> => {
    if (!isRequestActive(snapshot)) return { kind: 'stale' }

    const kind = classifyApiError(error)
    if (kind === 'PERMISSION_DENIED' || kind === 'NOT_FOUND') {
      return clearForScopedAccess(snapshot, kind)
    }
    if (kind === 'AUTHENTICATION_REQUIRED') {
      clearForAuthentication()
      return { kind: 'error', errorKind: kind }
    }

    setError(kind)
    if (mode === 'initial') phase.value = 'error'
    if (mode === 'refresh') phase.value = 'refresh-error'
    if (mode === 'more') phase.value = 'load-more-error'
    return { kind: 'error', errorKind: kind }
  }

  const loadPage = async (
    requestedPage: number,
    mode: 'initial' | 'refresh' | 'more',
  ): Promise<TeamSharedReviewOutcome> => {
    const teamId = activeTeamId.value
    if (!teamId) return { kind: 'ignored' }
    if (mode !== 'initial' && busy.value) return { kind: 'ignored' }

    const source = getCollaboration()
    const actorId = source.currentUser?.id
    if (!actorId) {
      clearForAuthentication()
      return { kind: 'error', errorKind: 'AUTHENTICATION_REQUIRED' }
    }
    if (!isTeamAvailable(teamId)) {
      requestRevision += 1
      activeTeamId.value = null
      clearRecords()
      setError('NOT_FOUND', true)
      return { kind: 'error', errorKind: 'NOT_FOUND' }
    }

    const snapshot: RequestSnapshot = {
      revision: ++requestRevision,
      teamId,
      actorId,
      sessionEpoch: source.sessionEpoch,
    }
    phase.value =
      mode === 'initial' ? 'loading' : mode === 'refresh' ? 'refreshing' : 'loading-more'
    clearError()

    try {
      const wirePage = await fetchReviews({
        teamId,
        current: requestedPage,
        size: pageSize,
      })
      if (!isRequestActive(snapshot)) return { kind: 'stale' }

      const page: PageResult<SharedWeeklyReview> = normalizeSharedWeeklyReviewPage(wirePage)
      records.value =
        mode === 'more' ? mergeSharedWeeklyReviews(records.value, page.records) : page.records
      current.value = page.current
      size.value = page.size
      total.value = page.total
      phase.value = 'ready'
      clearError()
      return { kind: 'success' }
    } catch (error) {
      return handleRequestError(error, snapshot, mode)
    }
  }

  const open = async (rawTeamId: EntityId): Promise<TeamSharedReviewOutcome> => {
    requestRevision += 1
    activeTeamId.value = null
    clearRecords()
    clearError()

    const teamId = normalizeEntityId(rawTeamId)
    if (!teamId) {
      setError('VALIDATION', true)
      return { kind: 'error', errorKind: 'VALIDATION' }
    }

    const source = getCollaboration()
    if (!source.currentUser?.id) {
      clearForAuthentication()
      return { kind: 'error', errorKind: 'AUTHENTICATION_REQUIRED' }
    }
    if (!isTeamAvailable(teamId)) {
      setError('NOT_FOUND', true)
      return { kind: 'error', errorKind: 'NOT_FOUND' }
    }

    activeTeamId.value = teamId
    phase.value = 'idle'
    return loadPage(1, 'initial')
  }

  const refresh = () => {
    if (!activeTeamId.value || busy.value)
      return Promise.resolve<TeamSharedReviewOutcome>({ kind: 'ignored' })
    return loadPage(1, 'refresh')
  }

  const loadMore = () => {
    if (!activeTeamId.value || busy.value || !hasMore.value) {
      return Promise.resolve<TeamSharedReviewOutcome>({ kind: 'ignored' })
    }
    return loadPage(current.value + 1, 'more')
  }

  /**
   * Call after the collaboration team list is refreshed. This intentionally
   * clears the feed instead of silently switching to PRIVATE or another team.
   */
  const reconcileTeamAccess = () => {
    const teamId = activeTeamId.value
    if (!teamId || isTeamAvailable(teamId)) return false
    requestRevision += 1
    activeTeamId.value = null
    clearRecords()
    setError('NOT_FOUND', true)
    return true
  }

  const reset = () => {
    requestRevision += 1
    activeTeamId.value = null
    clearRecords()
    phase.value = 'idle'
    clearError()
  }

  return {
    activeTeamId: readonly(activeTeamId),
    records: readonly(records),
    current: readonly(current),
    size: readonly(size),
    total: readonly(total),
    phase: readonly(phase),
    errorKind: readonly(errorKind),
    errorMessage: readonly(errorMessage),
    busy,
    hasMore,
    open,
    refresh,
    loadMore,
    reconcileTeamAccess,
    reset,
  }
}
