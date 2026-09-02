import { describe, expect, it, vi } from 'vitest'

import type { EntityId, WirePage } from '@/types/common'
import type { SharedWeeklyReviewWire } from '@/types/review'
import { ApiRequestError } from '@/utils/request'
import {
  mergeSharedWeeklyReviews,
  useTeamSharedReviews,
  type TeamSharedReviewCollaborationSource,
} from './useTeamSharedReviews'
import type { TeamSharedReviewParams } from '@/api/review'

const reviewWire = (id: number, summary: string): SharedWeeklyReviewWire => ({
  id,
  author: { id: 7, username: `User ${id}` },
  year: 2026,
  weekNo: 36,
  startDate: '2026-08-31',
  endDate: '2026-09-06',
  focusProject: { id: id + 100, name: `Project ${id}` },
  sharedSummary: summary,
  createTime: '2026-09-01T08:00:00',
  updateTime: '2026-09-01T09:00:00',
})

const page = (
  records: SharedWeeklyReviewWire[],
  current: number,
  size = 2,
  total = records.length,
): WirePage<SharedWeeklyReviewWire> => ({
  records,
  current,
  size,
  total,
})

const createCollaboration = (teamIds: string[] = ['10', '20']) => {
  const availableTeams = new Set(teamIds)
  const source: TeamSharedReviewCollaborationSource & {
    removeTeam: (teamId: string) => void
    changeActor: (actorId: string | null) => void
    advanceSession: () => void
  } = {
    currentUser: { id: '7' },
    sessionEpoch: 0,
    getTeam: vi.fn((teamId: EntityId) =>
      availableTeams.has(String(teamId)) ? { id: String(teamId) } : null,
    ),
    pruneTeamContext: vi.fn((teamId: EntityId) => {
      availableTeams.delete(String(teamId))
    }),
    refreshMyTeams: vi.fn(async () => []),
    removeTeam: (teamId: string) => {
      availableTeams.delete(teamId)
    },
    changeActor: (actorId: string | null) => {
      source.currentUser = actorId ? { id: actorId } : null
    },
    advanceSession: () => {
      source.sessionEpoch += 1
    },
  }
  return source
}

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('useTeamSharedReviews', () => {
  it('loads the first page with the selected team and normalizes records', async () => {
    const collaboration = createCollaboration(['10'])
    const fetchReviews = vi.fn(async (params: TeamSharedReviewParams) => {
      expect(params).toEqual({ teamId: '10', current: 1, size: 20 })
      return page([reviewWire(1, 'Visible')], 1, 20, 1)
    })
    const sharedReviews = useTeamSharedReviews({ fetchReviews, collaboration })

    await expect(sharedReviews.open(10)).resolves.toEqual({ kind: 'success' })
    expect(fetchReviews).toHaveBeenCalledTimes(1)
    expect(sharedReviews.activeTeamId.value).toBe('10')
    expect(sharedReviews.records.value).toEqual([
      expect.objectContaining({ id: '1', sharedSummary: 'Visible' }),
    ])
    expect(sharedReviews.phase.value).toBe('ready')
    expect(sharedReviews.hasMore.value).toBe(false)
  })

  it('merges later pages by id while preserving first-seen order', async () => {
    const collaboration = createCollaboration(['10'])
    const responses = [
      page([reviewWire(1, 'One'), reviewWire(2, 'Old two')], 1, 2, 3),
      page([reviewWire(2, 'New two'), reviewWire(3, 'Three')], 2, 2, 3),
    ]
    const fetchReviews = vi.fn(async () => responses.shift()!)
    const sharedReviews = useTeamSharedReviews({ fetchReviews, collaboration })

    await sharedReviews.open('10')
    await expect(sharedReviews.loadMore()).resolves.toEqual({ kind: 'success' })

    expect(sharedReviews.records.value.map((review) => review.id)).toEqual(['1', '2', '3'])
    expect(sharedReviews.records.value[1]?.sharedSummary).toBe('New two')
    expect(sharedReviews.current.value).toBe(2)
    expect(sharedReviews.hasMore.value).toBe(false)
  })

  it('replaces records on refresh instead of retaining deleted or private entries', async () => {
    const collaboration = createCollaboration(['10'])
    const responses = [
      page([reviewWire(1, 'Old')], 1, 20, 1),
      page([reviewWire(2, 'New')], 1, 20, 1),
    ]
    const fetchReviews = vi.fn(async () => responses.shift()!)
    const sharedReviews = useTeamSharedReviews({ fetchReviews, collaboration })

    await sharedReviews.open('10')
    await expect(sharedReviews.refresh()).resolves.toEqual({ kind: 'success' })

    expect(sharedReviews.records.value.map((review) => review.id)).toEqual(['2'])
  })

  it('preserves loaded records when refresh or load-more has a retryable error', async () => {
    const collaboration = createCollaboration(['10'])
    const fetchReviews = vi
      .fn()
      .mockResolvedValueOnce(page([reviewWire(1, 'Loaded')], 1, 1, 2))
      .mockRejectedValueOnce(new ApiRequestError('network', { httpStatus: 503 }))
      .mockRejectedValueOnce(new ApiRequestError('network', { httpStatus: 503 }))
    const sharedReviews = useTeamSharedReviews({ fetchReviews, collaboration, pageSize: 1 })

    await sharedReviews.open('10')
    await expect(sharedReviews.refresh()).resolves.toEqual({ kind: 'error', errorKind: 'SERVER' })
    expect(sharedReviews.records.value.map((review) => review.id)).toEqual(['1'])
    expect(sharedReviews.phase.value).toBe('refresh-error')

    await expect(sharedReviews.loadMore()).resolves.toEqual({ kind: 'error', errorKind: 'SERVER' })
    expect(sharedReviews.records.value.map((review) => review.id)).toEqual(['1'])
    expect(sharedReviews.phase.value).toBe('load-more-error')
  })

  it('ignores duplicate load-more calls while a request is in flight', async () => {
    const collaboration = createCollaboration(['10'])
    const first = deferred<WirePage<SharedWeeklyReviewWire>>()
    const fetchReviews = vi.fn(() => first.promise)
    const sharedReviews = useTeamSharedReviews({ fetchReviews, collaboration })

    const opening = sharedReviews.open('10')
    await expect(sharedReviews.loadMore()).resolves.toEqual({ kind: 'ignored' })
    first.resolve(page([reviewWire(1, 'Loaded')], 1, 20, 1))
    await opening

    expect(fetchReviews).toHaveBeenCalledTimes(1)
  })

  it('discards a late response from the previous team', async () => {
    const collaboration = createCollaboration(['10', '20'])
    const teamA = deferred<WirePage<SharedWeeklyReviewWire>>()
    const teamB = deferred<WirePage<SharedWeeklyReviewWire>>()
    const fetchReviews = vi.fn((params: TeamSharedReviewParams) =>
      params.teamId === '10' ? teamA.promise : teamB.promise,
    )
    const sharedReviews = useTeamSharedReviews({ fetchReviews, collaboration })

    const openingA = sharedReviews.open('10')
    const openingB = sharedReviews.open('20')
    teamB.resolve(page([reviewWire(20, 'Team B')], 1, 20, 1))
    await expect(openingB).resolves.toEqual({ kind: 'success' })
    teamA.resolve(page([reviewWire(10, 'Team A')], 1, 20, 1))
    await expect(openingA).resolves.toEqual({ kind: 'stale' })

    expect(sharedReviews.activeTeamId.value).toBe('20')
    expect(sharedReviews.records.value.map((review) => review.id)).toEqual(['20'])
  })

  it('discards a response after the actor or session changes', async () => {
    const collaboration = createCollaboration(['10'])
    const pending = deferred<WirePage<SharedWeeklyReviewWire>>()
    const fetchReviews = vi.fn(() => pending.promise)
    const sharedReviews = useTeamSharedReviews({ fetchReviews, collaboration })

    const opening = sharedReviews.open('10')
    collaboration.changeActor('8')
    collaboration.advanceSession()
    pending.resolve(page([reviewWire(1, 'Stale')], 1, 20, 1))

    await expect(opening).resolves.toEqual({ kind: 'stale' })
    expect(sharedReviews.records.value).toEqual([])
  })

  it.each([
    ['PERMISSION_DENIED', 40300, 403, 'forbidden'],
    ['NOT_FOUND', 40400, 404, 'not-found'],
  ] as const)(
    'clears records and prunes the team on %s',
    async (_label, code, httpStatus, expectedPhase) => {
      const collaboration = createCollaboration(['10'])
      const fetchReviews = vi.fn(async () => {
        throw new ApiRequestError('access lost', { code, httpStatus })
      })
      const sharedReviews = useTeamSharedReviews({ fetchReviews, collaboration })

      await expect(sharedReviews.open('10')).resolves.toEqual({
        kind: 'error',
        errorKind: code === 40300 ? 'PERMISSION_DENIED' : 'NOT_FOUND',
      })
      expect(sharedReviews.records.value).toEqual([])
      expect(sharedReviews.activeTeamId.value).toBeNull()
      expect(sharedReviews.phase.value).toBe(expectedPhase)
      expect(collaboration.pruneTeamContext).toHaveBeenCalledWith('10')
      expect(collaboration.refreshMyTeams).toHaveBeenCalledTimes(1)
      expect(collaboration.getTeam?.('10')).toBeNull()
    },
  )

  it('clears only the shared page state on authentication failure', async () => {
    const collaboration = createCollaboration(['10'])
    const fetchReviews = vi
      .fn()
      .mockResolvedValueOnce(page([reviewWire(1, 'Loaded')], 1, 20, 1))
      .mockRejectedValueOnce(new ApiRequestError('expired', { code: 40100, httpStatus: 401 }))
    const sharedReviews = useTeamSharedReviews({ fetchReviews, collaboration })

    await sharedReviews.open('10')
    await expect(sharedReviews.refresh()).resolves.toEqual({
      kind: 'error',
      errorKind: 'AUTHENTICATION_REQUIRED',
    })
    expect(sharedReviews.records.value).toEqual([])
    expect(sharedReviews.activeTeamId.value).toBeNull()
    expect(sharedReviews.phase.value).toBe('authentication-required')
    expect(collaboration.pruneTeamContext).not.toHaveBeenCalled()
  })

  it('does not restore records after reset or explicit team-access reconciliation', async () => {
    const collaboration = createCollaboration(['10'])
    const pending = deferred<WirePage<SharedWeeklyReviewWire>>()
    const fetchReviews = vi.fn(() => pending.promise)
    const sharedReviews = useTeamSharedReviews({ fetchReviews, collaboration })

    const opening = sharedReviews.open('10')
    sharedReviews.reset()
    pending.resolve(page([reviewWire(1, 'Should not return')], 1, 20, 1))
    await expect(opening).resolves.toEqual({ kind: 'stale' })
    expect(sharedReviews.records.value).toEqual([])

    await sharedReviews.open('10')
    collaboration.removeTeam('10')
    expect(sharedReviews.reconcileTeamAccess()).toBe(true)
    expect(sharedReviews.records.value).toEqual([])
    expect(sharedReviews.activeTeamId.value).toBeNull()
    expect(sharedReviews.phase.value).toBe('not-found')
  })

  it('merges duplicate input without exposing duplicate IDs', () => {
    const first = normalizeReviewForMerge('1', 'first')
    const second = normalizeReviewForMerge('1', 'second')
    const third = normalizeReviewForMerge('2', 'third')

    const merged = mergeSharedWeeklyReviews([first, first], [second, third])

    expect(merged.map((review) => review.id)).toEqual(['1', '2'])
    expect(merged[0]?.sharedSummary).toBe('second')
  })
})

const normalizeReviewForMerge = (id: string, sharedSummary: string) => ({
  id,
  author: { id: '7', username: 'User' },
  year: 2026,
  weekNo: 36,
  startDate: null,
  endDate: null,
  focusProject: null,
  sharedSummary,
  createTime: null,
  updateTime: null,
})
