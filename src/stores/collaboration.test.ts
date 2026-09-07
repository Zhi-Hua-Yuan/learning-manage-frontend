import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiRequestError } from '@/utils/request'
import { getActiveCacheActor } from '@/utils/cacheActor'
import { useCollaborationStore } from './collaboration'

const apiMocks = vi.hoisted(() => ({
  getUserMeApi: vi.fn(),
  fetchMyTeamsApi: vi.fn(),
  fetchTeamProjectsApi: vi.fn(),
  fetchTeamMembersApi: vi.fn(),
  createTeamApi: vi.fn(),
  joinTeamApi: vi.fn(),
  updateTeamApi: vi.fn(),
  fetchTeamInviteApi: vi.fn(),
  regenerateTeamInviteApi: vi.fn(),
  updateTeamMemberRoleApi: vi.fn(),
  leaveTeamApi: vi.fn(),
  removeTeamMemberApi: vi.fn(),
  transferTeamOwnershipApi: vi.fn(),
  fetchTeamDissolutionCheckApi: vi.fn(),
  dissolveTeamApi: vi.fn(),
}))

vi.mock('@/api/user', () => ({ getUserMeApi: apiMocks.getUserMeApi }))
vi.mock('@/api/team', () => ({
  fetchMyTeamsApi: apiMocks.fetchMyTeamsApi,
  fetchTeamMembersApi: apiMocks.fetchTeamMembersApi,
  createTeamApi: apiMocks.createTeamApi,
  joinTeamApi: apiMocks.joinTeamApi,
  updateTeamApi: apiMocks.updateTeamApi,
  fetchTeamInviteApi: apiMocks.fetchTeamInviteApi,
  regenerateTeamInviteApi: apiMocks.regenerateTeamInviteApi,
  updateTeamMemberRoleApi: apiMocks.updateTeamMemberRoleApi,
  leaveTeamApi: apiMocks.leaveTeamApi,
  removeTeamMemberApi: apiMocks.removeTeamMemberApi,
  transferTeamOwnershipApi: apiMocks.transferTeamOwnershipApi,
  fetchTeamDissolutionCheckApi: apiMocks.fetchTeamDissolutionCheckApi,
  dissolveTeamApi: apiMocks.dissolveTeamApi,
}))
vi.mock('@/api/project', () => ({ fetchTeamProjectsApi: apiMocks.fetchTeamProjectsApi }))

const userWire = (id: number | string, username = `User ${String(id)}`) => ({
  id,
  account: `account-${String(id)}`,
  username,
  userRole: 'USER',
})

const teamWire = (id: number | string, ownerId: number | string = 1) => ({
  id,
  ownerId,
  name: `Team ${String(id)}`,
  description: '',
  role: 'OWNER',
})

const projectWire = (
  id: number | string,
  teamId: number | string = 10,
  userId: number | string = 1,
) => ({
  id,
  userId,
  teamId,
  name: `Project ${String(id)}`,
  goal: '',
  scope: 'TEAM',
})

const projectPage = (
  records: ReturnType<typeof projectWire>[],
  current = 1,
  size = 100,
  total = records.length,
) => ({ records, current, size, total })

const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('collaboration store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    apiMocks.getUserMeApi.mockResolvedValue(userWire(1, 'Alice'))
    apiMocks.fetchMyTeamsApi.mockResolvedValue([teamWire(10)])
    apiMocks.fetchTeamProjectsApi.mockResolvedValue(projectPage([projectWire(101)]))
    apiMocks.fetchTeamMembersApi.mockResolvedValue([
      { userId: 1, username: 'Alice', role: 'OWNER', joinTime: '2026-08-01T00:00:00Z' },
    ])
    apiMocks.createTeamApi.mockResolvedValue({ teamId: 11, inviteCode: 'ABCDEFGH' })
    apiMocks.joinTeamApi.mockResolvedValue(true)
    apiMocks.updateTeamApi.mockResolvedValue(teamWire(10))
    apiMocks.fetchTeamInviteApi.mockResolvedValue({ teamId: 10, inviteCode: 'ABCDEFGH' })
    apiMocks.regenerateTeamInviteApi.mockResolvedValue({ teamId: 10, inviteCode: 'BCDEFGHJ' })
    apiMocks.updateTeamMemberRoleApi.mockResolvedValue(true)
    apiMocks.leaveTeamApi.mockResolvedValue({ teamId: 10, memberUserId: 1, action: 'MEMBER_LEFT', unassignedTaskCount: 0 })
    apiMocks.removeTeamMemberApi.mockResolvedValue({ teamId: 10, memberUserId: 2, action: 'MEMBER_REMOVED', unassignedTaskCount: 1 })
    apiMocks.transferTeamOwnershipApi.mockResolvedValue({ teamId: 10, previousOwnerUserId: 1, newOwnerUserId: 2 })
    apiMocks.fetchTeamDissolutionCheckApi.mockResolvedValue({ teamId: 10, canDissolve: true, activeProjectCount: 0, sharedReviewCount: 0 })
    apiMocks.dissolveTeamApi.mockResolvedValue({ teamId: 10, removedMemberCount: 2 })
  })

  it('bootstraps user before teams without eagerly loading projects or members', async () => {
    const order: string[] = []
    apiMocks.getUserMeApi.mockImplementation(async () => {
      order.push('user')
      return userWire(1, 'Alice')
    })
    apiMocks.fetchMyTeamsApi.mockImplementation(async () => {
      order.push('teams')
      return [teamWire(10)]
    })

    const store = useCollaborationStore()
    await store.bootstrapCollaborationContext()

    expect(order).toEqual(['user', 'teams'])
    expect(store.currentUser).toMatchObject({ id: '1', username: 'Alice' })
    expect(store.teams.map((team) => team.id)).toEqual(['10'])
    expect(apiMocks.fetchTeamProjectsApi).not.toHaveBeenCalled()
    expect(apiMocks.fetchTeamMembersApi).not.toHaveBeenCalled()
  })

  it('deduplicates concurrent bootstrap requests', async () => {
    const pendingUser = deferred<ReturnType<typeof userWire>>()
    apiMocks.getUserMeApi.mockReturnValue(pendingUser.promise)
    const store = useCollaborationStore()

    const first = store.bootstrapCollaborationContext()
    const second = store.bootstrapCollaborationContext()
    pendingUser.resolve(userWire(1, 'Alice'))

    await expect(Promise.all([first, second])).resolves.toHaveLength(2)
    expect(apiMocks.getUserMeApi).toHaveBeenCalledTimes(1)
    expect(apiMocks.fetchMyTeamsApi).toHaveBeenCalledTimes(1)
  })

  it('filters malformed and duplicate team records without inventing access', async () => {
    apiMocks.fetchMyTeamsApi.mockResolvedValue([
      teamWire(10),
      teamWire(10),
      { id: 'bad', ownerId: 1, name: 'Invalid', role: 'OWNER' },
      { id: 11, ownerId: 1, name: 'Unknown role', role: 'owner' },
    ])
    const store = useCollaborationStore()

    await store.bootstrapCollaborationContext()

    expect(store.teams).toHaveLength(2)
    expect(store.getTeam(11)?.role).toBe('UNKNOWN')
  })

  it('loads only the requested team projects and reuses ready data', async () => {
    const store = useCollaborationStore()
    await store.bootstrapCollaborationContext()

    const first = await store.ensureTeamProjects(10)
    const second = await store.ensureTeamProjects('10')

    expect(first).toEqual(second)
    expect(apiMocks.fetchTeamProjectsApi).toHaveBeenCalledTimes(1)
    expect(apiMocks.fetchTeamProjectsApi).toHaveBeenCalledWith({
      teamId: '10', pageNum: 1, pageSize: 100,
    })
  })

  it('deduplicates concurrent project requests for the same team', async () => {
    const pendingProjects = deferred<ReturnType<typeof projectPage>>()
    apiMocks.fetchTeamProjectsApi.mockReturnValue(pendingProjects.promise)
    const store = useCollaborationStore()
    await store.bootstrapCollaborationContext()

    const first = store.ensureTeamProjects(10)
    const second = store.ensureTeamProjects(10)
    pendingProjects.resolve(projectPage([projectWire(101)]))

    await expect(Promise.all([first, second])).resolves.toHaveLength(2)
    expect(apiMocks.fetchTeamProjectsApi).toHaveBeenCalledTimes(1)
  })

  it('paginates projects, removes duplicates, and rejects cross-team records', async () => {
    apiMocks.fetchTeamProjectsApi
      .mockResolvedValueOnce(projectPage([projectWire(101), projectWire(999, 99)], 1, 100, 200))
      .mockResolvedValueOnce(projectPage([projectWire(101), projectWire(102)], 2, 100, 200))
    const store = useCollaborationStore()
    await store.bootstrapCollaborationContext()

    await store.ensureTeamProjects(10)
    const records = await store.loadMoreTeamProjects(10)

    expect(records.map((project) => project.id)).toEqual(['101', '102'])
    expect(store.teamProjectsByTeamId['10']).toMatchObject({
      current: 2, total: 200, hasMore: false,
    })
  })

  it('loads members lazily, injects team context, and replaces stale members on refresh', async () => {
    apiMocks.fetchTeamMembersApi
      .mockResolvedValueOnce([
        { userId: 1, username: 'Alice', role: 'OWNER', joinTime: '2026-08-01' },
        { userId: 2, username: 'Bob', role: 'MEMBER', joinTime: '2026-08-02' },
        { userId: 2, username: 'Duplicate', role: 'ADMIN', joinTime: '2026-08-03' },
      ])
      .mockResolvedValueOnce([
        { userId: 1, username: 'Alice', role: 'OWNER', joinTime: '2026-08-01' },
      ])
    const store = useCollaborationStore()
    await store.bootstrapCollaborationContext()

    const first = await store.ensureTeamMembers(10)
    const refreshed = await store.ensureTeamMembers(10, { force: true })

    expect(first.map((member) => member.userId)).toEqual(['1', '2'])
    expect(first.every((member) => member.teamId === '10')).toBe(true)
    expect(refreshed.map((member) => member.userId)).toEqual(['1'])
  })

  it('rejects invalid and unavailable team IDs before sending resource requests', async () => {
    const store = useCollaborationStore()
    await store.bootstrapCollaborationContext()

    expect(() => store.ensureTeamProjects('bad')).toThrow(TypeError)
    await expect(store.ensureTeamProjects(99)).rejects.toThrow('Team context is not available')
    await expect(store.ensureTeamMembers(99)).rejects.toThrow('Team context is not available')
    expect(apiMocks.fetchTeamProjectsApi).not.toHaveBeenCalled()
    expect(apiMocks.fetchTeamMembersApi).not.toHaveBeenCalled()
  })

  it('restores a direct team project context by scanning available pages', async () => {
    apiMocks.fetchTeamProjectsApi
      .mockResolvedValueOnce(projectPage([projectWire(101)], 1, 100, 200))
      .mockResolvedValueOnce(projectPage([projectWire(102)], 2, 100, 200))
    const store = useCollaborationStore()
    await store.bootstrapCollaborationContext()

    await expect(store.restoreTeamProjectContext(10, 102)).resolves.toMatchObject({
      kind: 'ready',
      team: { id: '10' },
      project: { id: '102', teamId: '10' },
    })
  })

  it('does not treat a project on a later page as lost after a forced refresh', async () => {
    apiMocks.fetchTeamProjectsApi
      .mockResolvedValueOnce(projectPage([{ ...projectWire(101), name: '第一页项目' }], 1, 100, 200))
      .mockResolvedValueOnce(projectPage([{ ...projectWire(101), name: '第一页项目' }], 1, 100, 200))
      .mockResolvedValueOnce(projectPage([{ ...projectWire(102), name: '第二页项目' }], 2, 100, 200))
    const store = useCollaborationStore()
    await store.bootstrapCollaborationContext()

    await store.ensureTeamProjects(10)
    await store.ensureTeamProjects(10, { force: true })
    expect(store.teamProjectsByTeamId['10']?.hasMore).toBe(true)

    await expect(store.restoreTeamProjectContext(10, 102)).resolves.toMatchObject({
      kind: 'ready',
      project: { id: '102', name: '第二页项目' },
    })
  })

  it('returns explicit restoration outcomes for invalid or missing context', async () => {
    const store = useCollaborationStore()

    await expect(store.restoreTeamProjectContext('bad', 1)).resolves.toEqual({
      kind: 'invalid-context',
    })
    await store.bootstrapCollaborationContext()
    await expect(store.restoreTeamProjectContext(99, 1)).resolves.toEqual({
      kind: 'team-unavailable',
    })
    await expect(store.restoreTeamProjectContext(10, 999)).resolves.toEqual({
      kind: 'project-unavailable',
    })
  })

  it('prunes project and member state when a team disappears', async () => {
    const store = useCollaborationStore()
    await store.bootstrapCollaborationContext()
    await store.ensureTeamProjects(10)
    await store.ensureTeamMembers(10)
    apiMocks.fetchMyTeamsApi.mockResolvedValueOnce([])

    await store.refreshMyTeams()

    expect(store.getTeam(10)).toBeNull()
    expect(store.teamProjectsByTeamId['10']).toBeUndefined()
    expect(store.teamMembersByTeamId['10']).toBeUndefined()
  })

  it('clears the previous actor context when the current user changes', async () => {
    const store = useCollaborationStore()
    await store.bootstrapCollaborationContext()
    await store.ensureTeamProjects(10)
    await store.ensureTeamMembers(10)
    apiMocks.getUserMeApi.mockResolvedValueOnce(userWire(2, 'Bob'))
    apiMocks.fetchMyTeamsApi.mockResolvedValueOnce([teamWire(20, 2)])

    await store.bootstrapCollaborationContext({ force: true })

    expect(store.currentUser?.id).toBe('2')
    expect(getActiveCacheActor()).toBe('2')
    expect(store.teams.map((team) => team.id)).toEqual(['20'])
    expect(store.teamProjectsByTeamId['10']).toBeUndefined()
    expect(store.teamMembersByTeamId['10']).toBeUndefined()
  })

  it('does not let a late response from the previous actor repopulate state', async () => {
    const pendingProjects = deferred<ReturnType<typeof projectPage>>()
    const store = useCollaborationStore()
    await store.bootstrapCollaborationContext()
    apiMocks.fetchTeamProjectsApi.mockReturnValueOnce(pendingProjects.promise)
    const oldRequest = store.ensureTeamProjects(10)

    store.clearCollaborationContext()
    apiMocks.getUserMeApi.mockResolvedValueOnce(userWire(2, 'Bob'))
    apiMocks.fetchMyTeamsApi.mockResolvedValueOnce([teamWire(20, 2)])
    await store.bootstrapCollaborationContext()
    pendingProjects.resolve(projectPage([projectWire(101)]))
    await oldRequest

    expect(store.currentUser?.id).toBe('2')
    expect(store.teamProjectsByTeamId['10']).toBeUndefined()
  })

  it('keeps same-id team data isolated when a previous actor responds late', async () => {
    const pendingPreviousActor = deferred<ReturnType<typeof projectPage>>()
    const store = useCollaborationStore()
    await store.bootstrapCollaborationContext()
    apiMocks.fetchTeamProjectsApi.mockReturnValueOnce(pendingPreviousActor.promise)
    const previousRequest = store.ensureTeamProjects(10)

    store.clearCollaborationContext()
    apiMocks.getUserMeApi.mockResolvedValueOnce(userWire(2, 'Bob'))
    apiMocks.fetchMyTeamsApi.mockResolvedValueOnce([teamWire(10, 2)])
    await store.bootstrapCollaborationContext()
    apiMocks.fetchTeamProjectsApi.mockResolvedValueOnce(
      projectPage([{ ...projectWire(101, 10, 2), name: 'B project' }]),
    )
    await store.ensureTeamProjects(10)

    pendingPreviousActor.resolve(
      projectPage([{ ...projectWire(101, 10, 1), name: 'A project' }]),
    )
    await previousRequest

    expect(store.currentUser?.id).toBe('2')
    expect(store.getTeamProjects(10).map((project) => project.name)).toEqual(['B project'])
  })

  it('clears scoped data and revalidates teams after permission denial', async () => {
    const store = useCollaborationStore()
    await store.bootstrapCollaborationContext()
    await store.ensureTeamMembers(10)
    apiMocks.fetchTeamProjectsApi.mockRejectedValueOnce(
      new ApiRequestError('forbidden', { code: 40300, httpStatus: 403 }),
    )
    apiMocks.fetchMyTeamsApi.mockResolvedValueOnce([])

    await expect(store.ensureTeamProjects(10)).rejects.toThrow('forbidden')

    expect(store.currentUser?.id).toBe('1')
    expect(store.getTeam(10)).toBeNull()
    expect(store.teamProjectsByTeamId['10']).toBeUndefined()
    expect(store.teamMembersByTeamId['10']).toBeUndefined()
    expect(apiMocks.fetchMyTeamsApi).toHaveBeenCalledTimes(2)
  })

  it('clears all collaboration state after authentication failure', async () => {
    const store = useCollaborationStore()
    await store.bootstrapCollaborationContext()
    apiMocks.fetchTeamMembersApi.mockRejectedValueOnce(
      new ApiRequestError('expired', { code: 40100, httpStatus: 401 }),
    )

    await expect(store.ensureTeamMembers(10)).rejects.toThrow('expired')

    expect(store.currentUser).toBeNull()
    expect(getActiveCacheActor()).toBeNull()
    expect(store.teams).toEqual([])
    expect(store.teamMembersByTeamId['10']).toBeUndefined()
  })

  it('retains last successful data after a retryable refresh error', async () => {
    const store = useCollaborationStore()
    await store.bootstrapCollaborationContext()
    await store.ensureTeamProjects(10)
    apiMocks.fetchTeamProjectsApi.mockRejectedValueOnce(new ApiRequestError('offline'))

    await expect(store.ensureTeamProjects(10, { force: true })).rejects.toThrow('offline')

    expect(store.getTeamProjects(10).map((project) => project.id)).toEqual(['101'])
    expect(store.teamProjectsByTeamId['10']?.loadState).toMatchObject({
      status: 'error', errorMessage: 'offline',
    })
  })

  it('invalidates an in-flight resource request without allowing resurrection', async () => {
    const pendingProjects = deferred<ReturnType<typeof projectPage>>()
    apiMocks.fetchTeamProjectsApi.mockReturnValueOnce(pendingProjects.promise)
    const store = useCollaborationStore()
    await store.bootstrapCollaborationContext()
    const request = store.ensureTeamProjects(10)

    store.invalidateTeamProjects(10)
    pendingProjects.resolve(projectPage([projectWire(101)]))
    await request

    expect(store.teamProjectsByTeamId['10']).toBeUndefined()
  })

  it('settles a discarded member request instead of leaving its bucket loading forever', async () => {
    const pendingMembers = deferred<Array<{ userId: number; username: string; role: string }>>()
    apiMocks.fetchTeamMembersApi.mockReturnValueOnce(pendingMembers.promise)
    const store = useCollaborationStore()
    await store.bootstrapCollaborationContext()
    const request = store.ensureTeamMembers(10)

    store.currentUser = { ...store.currentUser!, id: '2' }
    pendingMembers.resolve([{ userId: 1, username: 'Alice', role: 'OWNER' }])
    await request

    expect(store.teamMembersByTeamId['10']?.loadState.status).toBe('idle')
  })

  it('keeps a newer forced member refresh loading when an older request returns', async () => {
    const older = deferred<Array<{ userId: number; username: string; role: string }>>()
    const newer = deferred<Array<{ userId: number; username: string; role: string }>>()
    apiMocks.fetchTeamMembersApi.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise)
    const store = useCollaborationStore()
    await store.bootstrapCollaborationContext()

    const olderRequest = store.ensureTeamMembers(10)
    const newerRequest = store.ensureTeamMembers(10, { force: true })
    older.resolve([{ userId: 1, username: 'Old', role: 'OWNER' }])
    await olderRequest
    expect(store.teamMembersByTeamId['10']?.loadState.status).toBe('loading')

    newer.resolve([
      { userId: 1, username: 'Alice', role: 'OWNER' },
      { userId: 2, username: 'Bob', role: 'MEMBER' },
    ])
    await newerRequest
    expect(store.getTeamMembers(10).map((value) => value.username)).toEqual(['Alice', 'Bob'])
    expect(store.teamMembersByTeamId['10']?.loadState.status).toBe('ready')
  })

  it('fails closed on an invalid current-user response', async () => {
    apiMocks.getUserMeApi.mockResolvedValueOnce({ id: 'unsafe' })
    const store = useCollaborationStore()

    await expect(store.bootstrapCollaborationContext()).rejects.toThrow('Invalid current user response')
    expect(store.currentUser).toBeNull()
    expect(apiMocks.fetchMyTeamsApi).not.toHaveBeenCalled()
  })

  it('never persists collaboration context in browser storage', async () => {
    const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem')
    const store = useCollaborationStore()

    await store.bootstrapCollaborationContext()
    await store.ensureTeamProjects(10)
    await store.ensureTeamMembers(10)

    expect(localStorageSpy).not.toHaveBeenCalled()
    localStorageSpy.mockRestore()
  })

  it('refreshes team context after creation and keeps the invite in the return value only', async () => {
    apiMocks.fetchMyTeamsApi
      .mockResolvedValueOnce([teamWire(10)])
      .mockResolvedValueOnce([teamWire(10), teamWire(11)])
    const store = useCollaborationStore()
    await store.bootstrapCollaborationContext()

    const result = await store.createTeam({ name: 'New team', description: '' })

    expect(result).toEqual({ teamId: '11', inviteCode: 'ABCDEFGH' })
    expect(store.teams.map((team) => team.id)).toEqual(['10', '11'])
    expect(JSON.stringify(store.$state)).not.toContain('ABCDEFGH')
  })

  it('prunes team resources after leaving and ignores an older team-list response', async () => {
    const store = useCollaborationStore()
    await store.bootstrapCollaborationContext()
    await store.ensureTeamProjects(10)
    await store.ensureTeamMembers(10)

    const stale = deferred<ReturnType<typeof teamWire>[]>()
    apiMocks.fetchMyTeamsApi.mockReturnValueOnce(stale.promise).mockResolvedValueOnce([])
    const staleRefresh = store.refreshMyTeams({ force: true })
    await store.leaveTeam(10)
    stale.resolve([teamWire(10)])
    await staleRefresh

    expect(store.getTeam(10)).toBeNull()
    expect(store.teamProjectsByTeamId['10']).toBeUndefined()
    expect(store.teamMembersByTeamId['10']).toBeUndefined()
  })
})
