import { reactive, ref, type Ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { TeamMemberContext } from '@/types/team'
import { ApiRequestError } from '@/utils/request'
import { useCollaborationStore } from '@/stores/collaboration'
import {
  useTaskAssigneeCandidates,
  type TaskAssigneeCandidateContext,
} from './useTaskAssigneeCandidates'

type TestStore = ReturnType<typeof useCollaborationStore>

const member = (
  userId: string,
  username: string,
  role: TeamMemberContext['role'] = 'MEMBER',
  teamId = '10',
): TeamMemberContext => ({
  teamId,
  userId,
  username,
  role,
  joinedAt: '2026-08-01T00:00:00Z',
})

const createStore = (members: Record<string, TeamMemberContext[]> = {}) => {
  const buckets = reactive<Record<string, {
    records: TeamMemberContext[]
    loadState: {
      status: 'idle' | 'loading' | 'ready' | 'error'
      errorKind: ReturnType<typeof import('@/utils/request').classifyApiError> | null
      errorMessage: string | null
    }
  }>>({})

  Object.entries(members).forEach(([teamId, records]) => {
    buckets[teamId] = {
      records,
      loadState: { status: 'ready', errorKind: null, errorMessage: null },
    }
  })

  const store = reactive({
    currentUser: { id: '1', username: 'Alice' },
    teamMembersByTeamId: buckets,
    getTeamMembers: (teamId: string) => buckets[teamId]?.records ?? [],
    ensureTeamMembers: vi.fn(async (teamId: string) => {
      buckets[teamId] = {
        records: members[teamId] ?? [],
        loadState: { status: 'ready', errorKind: null, errorMessage: null },
      }
      return buckets[teamId]!.records
    }),
  })

  return store as unknown as TestStore
}

const useCandidates = (
  context: Ref<TaskAssigneeCandidateContext>,
  store: TestStore,
) => useTaskAssigneeCandidates({ context, store })

const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('useTaskAssigneeCandidates', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds personal options without loading team members', () => {
    const context = ref<TaskAssigneeCandidateContext>({ kind: 'personal' })
    const store = createStore()
    const candidates = useCandidates(context, store)

    expect(candidates.status.value).toBe('ready')
    expect(candidates.options.value).toEqual([
      expect.objectContaining({ value: '1', label: 'Alice', kind: 'current-user' }),
    ])
    expect(store.ensureTeamMembers).not.toHaveBeenCalled()
  })

  it('does not eagerly load team members and forces a refresh when opened', async () => {
    const context = ref<TaskAssigneeCandidateContext>({ kind: 'team', teamId: '10' })
    const store = createStore({ '10': [member('2', 'Bob')] })
    const candidates = useCandidates(context, store)

    expect(candidates.status.value).toBe('idle')
    expect(candidates.options.value).toEqual([])
    expect(store.ensureTeamMembers).not.toHaveBeenCalled()

    await candidates.loadCandidates()
    await candidates.loadCandidates()

    expect(store.ensureTeamMembers).toHaveBeenCalledTimes(2)
    expect(store.ensureTeamMembers).toHaveBeenNthCalledWith(1, '10', { force: true })
    expect(candidates.options.value.map((option) => option.value)).toEqual([null, '2'])
  })

  it('only exposes ready data from the active team context', async () => {
    const context = ref<TaskAssigneeCandidateContext>({ kind: 'team', teamId: '10' })
    const store = createStore({
      '10': [member('2', 'Old member')],
      '20': [member('3', 'New member', 'ADMIN', '20')],
    })
    const candidates = useCandidates(context, store)

    await candidates.loadCandidates()
    expect(candidates.options.value.map((option) => option.value)).toEqual([null, '2'])

    context.value = { kind: 'team', teamId: '20' }
    expect(candidates.options.value).toEqual([])

    await candidates.loadCandidates()
    expect(candidates.options.value.map((option) => option.value)).toEqual([null, '3'])
    expect(candidates.isSelectableAssignee('2')).toBe(false)
    expect(candidates.isSelectableAssignee('3')).toBe(true)
  })

  it('discards a late response after switching teams', async () => {
    const context = ref<TaskAssigneeCandidateContext>({ kind: 'team', teamId: '10' })
    const store = createStore()
    const pending = deferred<TeamMemberContext[]>()
    store.ensureTeamMembers = vi.fn((teamId: string) => {
      if (teamId === '10') return pending.promise
      store.teamMembersByTeamId[teamId] = {
        records: [member('3', 'New member', 'MEMBER', '20')],
        loadState: { status: 'ready', errorKind: null, errorMessage: null },
      }
      return Promise.resolve(store.teamMembersByTeamId[teamId]!.records)
    }) as TestStore['ensureTeamMembers']

    const candidates = useCandidates(context, store)
    const oldRequest = candidates.loadCandidates()
    context.value = { kind: 'team', teamId: '20' }
    const newRequest = candidates.loadCandidates()

    await newRequest
    expect(candidates.options.value.map((option) => option.value)).toEqual([null, '3'])

    pending.resolve([member('2', 'Old member')])
    await oldRequest
    expect(candidates.options.value.map((option) => option.value)).toEqual([null, '3'])
    expect(candidates.readyContextKey.value).toBe('team:20')
  })

  it('does not expose retained stale records when a forced refresh fails', async () => {
    const context = ref<TaskAssigneeCandidateContext>({ kind: 'team', teamId: '10' })
    const store = createStore({ '10': [member('2', 'Stale member')] })
    store.ensureTeamMembers = vi.fn(async () => {
      const bucket = store.teamMembersByTeamId['10']!
      bucket.loadState.status = 'error'
      bucket.loadState.errorKind = 'NETWORK'
      throw new ApiRequestError('raw backend details')
    }) as TestStore['ensureTeamMembers']
    const candidates = useCandidates(context, store)

    await expect(candidates.loadCandidates()).resolves.toBe(false)

    expect(candidates.status.value).toBe('error')
    expect(candidates.options.value).toEqual([])
    expect(candidates.errorMessage.value).toBe('无法加载团队成员，请检查网络后重试。')
    expect(candidates.errorMessage.value).not.toContain('raw backend details')
    expect(candidates.isSelectableAssignee('2')).toBe(false)
    expect(candidates.isSelectableAssignee(null)).toBe(true)
  })

  it('allows retry after an error and publishes only the retry result', async () => {
    const context = ref<TaskAssigneeCandidateContext>({ kind: 'team', teamId: '10' })
    const store = createStore()
    let attempt = 0
    store.ensureTeamMembers = vi.fn(async () => {
      attempt += 1
      if (attempt === 1) throw new ApiRequestError('offline')
      store.teamMembersByTeamId['10'] = {
        records: [member('2', 'Recovered member')],
        loadState: { status: 'ready', errorKind: null, errorMessage: null },
      }
      return store.teamMembersByTeamId['10']!.records
    }) as TestStore['ensureTeamMembers']
    const candidates = useCandidates(context, store)

    await candidates.loadCandidates()
    expect(candidates.status.value).toBe('error')
    expect(candidates.options.value).toEqual([])

    await expect(candidates.retry()).resolves.toBe(true)
    expect(candidates.status.value).toBe('ready')
    expect(candidates.options.value.map((option) => option.value)).toEqual([null, '2'])
  })

  it('invalidates an in-flight request when the session actor changes', async () => {
    const context = ref<TaskAssigneeCandidateContext>({ kind: 'team', teamId: '10' })
    const store = createStore()
    const pending = deferred<TeamMemberContext[]>()
    store.ensureTeamMembers = vi.fn(() => pending.promise) as TestStore['ensureTeamMembers']
    const candidates = useCandidates(context, store)
    const request = candidates.loadCandidates()

    store.currentUser = { id: '2', username: 'Bob' } as TestStore['currentUser']
    pending.resolve([member('2', 'Old actor member')])
    await request

    expect(candidates.status.value).toBe('idle')
    expect(candidates.options.value).toEqual([])
    expect(candidates.readyContextKey.value).toBeNull()
  })

  it('resets team state without touching the collaboration store', async () => {
    const context = ref<TaskAssigneeCandidateContext>({ kind: 'team', teamId: '10' })
    const store = createStore({ '10': [member('2', 'Bob')] })
    const candidates = useCandidates(context, store)
    await candidates.loadCandidates()

    candidates.reset()

    expect(candidates.status.value).toBe('idle')
    expect(candidates.options.value).toEqual([])
    expect(store.teamMembersByTeamId['10']?.records).toHaveLength(1)
  })
})
