import { computed, onScopeDispose, reactive, ref } from 'vue'
import { defineStore } from 'pinia'

import { fetchTeamProjectsApi } from '@/api/project'
import {
  createTeamApi,
  dissolveTeamApi,
  fetchMyTeamsApi,
  fetchTeamDissolutionCheckApi,
  fetchTeamInviteApi,
  fetchTeamMembersApi,
  joinTeamApi,
  leaveTeamApi,
  regenerateTeamInviteApi,
  removeTeamMemberApi,
  transferTeamOwnershipApi,
  updateTeamApi,
  updateTeamMemberRoleApi,
  type TeamCreatePayload,
  type TeamUpdatePayload,
} from '@/api/team'
import { getUserMeApi } from '@/api/user'
import type { EntityId } from '@/types/common'
import {
  normalizeCurrentUserWire,
  normalizeEntityId,
  normalizePage,
  normalizeProjectWire,
  normalizeTeamMemberWire,
  normalizeTeamWire,
} from '@/types/normalization'
import type { ProjectContext } from '@/types/project'
import type { TeamContext, TeamMemberContext, TeamRole } from '@/types/team'
import type { CurrentUserContext } from '@/types/user'
import {
  classifyApiError,
  type ApiErrorKind,
} from '@/utils/request'
import { clearActiveCacheActor, setActiveCacheActor } from '@/utils/cacheActor'
import { registerSessionResetHandler, resetProtectedSessionState } from '@/utils/sessionLifecycle'

export type CollaborationLoadStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface CollaborationLoadState {
  status: CollaborationLoadStatus
  errorKind: ApiErrorKind | null
  errorMessage: string | null
}

export interface TeamProjectBucket {
  records: ProjectContext[]
  current: number
  size: number
  total: number
  hasMore: boolean
  loadState: CollaborationLoadState
}

export interface TeamMemberBucket {
  records: TeamMemberContext[]
  loadState: CollaborationLoadState
}

export type TeamProjectRestoreResult =
  | { kind: 'ready'; team: TeamContext; project: ProjectContext }
  | { kind: 'invalid-context' }
  | { kind: 'team-unavailable' }
  | { kind: 'project-unavailable' }
  | { kind: 'retryable-error'; errorKind: ApiErrorKind }

export interface CollaborationSnapshot {
  currentUser: CurrentUserContext
  teams: TeamContext[]
}

export interface TeamInviteContext {
  teamId: string
  inviteCode: string
}

export interface TeamTerminationContext {
  teamId: string
  memberUserId: string
  action: string
  unassignedTaskCount: number
  terminatedAt: string | null
}

export interface TeamDissolutionCheckContext {
  teamId: string
  canDissolve: boolean
  activeProjectCount: number
  sharedReviewCount: number
}

const TEAM_PROJECT_PAGE_SIZE = 100

const createLoadState = (): CollaborationLoadState => ({
  status: 'idle',
  errorKind: null,
  errorMessage: null,
})

const createProjectBucket = (): TeamProjectBucket => ({
  records: [],
  current: 0,
  size: TEAM_PROJECT_PAGE_SIZE,
  total: 0,
  hasMore: false,
  loadState: createLoadState(),
})

const createMemberBucket = (): TeamMemberBucket => ({
  records: [],
  loadState: createLoadState(),
})

const setLoading = (state: CollaborationLoadState) => {
  state.status = 'loading'
  state.errorKind = null
  state.errorMessage = null
}

const setReady = (state: CollaborationLoadState) => {
  state.status = 'ready'
  state.errorKind = null
  state.errorMessage = null
}

const setError = (state: CollaborationLoadState, error: unknown) => {
  state.status = 'error'
  state.errorKind = classifyApiError(error)
  state.errorMessage = error instanceof Error ? error.message : '请求失败'
}

const normalizeRequiredId = (value: EntityId, fieldName: string) => {
  const id = normalizeEntityId(value)
  if (!id) throw new TypeError(`${fieldName} must be a positive safe integer ID`)
  return id
}

const uniqueById = <T extends { id: string }>(values: T[]) => {
  const seen = new Set<string>()
  return values.filter((value) => {
    if (seen.has(value.id)) return false
    seen.add(value.id)
    return true
  })
}

const uniqueMembers = (values: TeamMemberContext[]) => {
  const seen = new Set<string>()
  return values.filter((value) => {
    if (seen.has(value.userId)) return false
    seen.add(value.userId)
    return true
  })
}

const isScopedAccessError = (kind: ApiErrorKind) => (
  kind === 'PERMISSION_DENIED' || kind === 'NOT_FOUND'
)

export const useCollaborationStore = defineStore('collaboration', () => {
  const currentUser = ref<CurrentUserContext | null>(null)
  const teams = ref<TeamContext[]>([])
  const teamProjectsByTeamId = reactive<Record<string, TeamProjectBucket>>({})
  const teamMembersByTeamId = reactive<Record<string, TeamMemberBucket>>({})
  const currentUserLoadState = reactive(createLoadState())
  const teamsLoadState = reactive(createLoadState())
  const sessionEpoch = ref(0)

  let bootstrapPromise: Promise<CollaborationSnapshot> | null = null
  let teamsPromise: Promise<TeamContext[]> | null = null
  let teamsRevision = 0
  const projectPromises = new Map<string, Promise<ProjectContext[]>>()
  const memberPromises = new Map<string, Promise<TeamMemberContext[]>>()
  const projectRevisions = new Map<string, number>()
  const memberRevisions = new Map<string, number>()

  const unregisterSessionReset = registerSessionResetHandler(() => {
    clearCollaborationContext()
  })
  onScopeDispose(unregisterSessionReset)

  const teamById = computed(() => new Map(teams.value.map((team) => [team.id, team])))

  const resetLoadState = (state: CollaborationLoadState) => {
    state.status = 'idle'
    state.errorKind = null
    state.errorMessage = null
  }

  const bumpRevision = (revisions: Map<string, number>, teamId: string) => {
    revisions.set(teamId, (revisions.get(teamId) ?? 0) + 1)
  }

  const invalidateTeamProjectsById = (teamId: string) => {
    bumpRevision(projectRevisions, teamId)
    projectPromises.delete(teamId)
    delete teamProjectsByTeamId[teamId]
  }

  const invalidateTeamMembersById = (teamId: string) => {
    bumpRevision(memberRevisions, teamId)
    memberPromises.delete(teamId)
    delete teamMembersByTeamId[teamId]
  }

  const pruneTeamContextById = (teamId: string) => {
    teams.value = teams.value.filter((team) => team.id !== teamId)
    invalidateTeamProjectsById(teamId)
    invalidateTeamMembersById(teamId)
  }

  const clearCollaborationContext = () => {
    sessionEpoch.value += 1
    clearActiveCacheActor()
    currentUser.value = null
    teams.value = []
    Object.keys(teamProjectsByTeamId).forEach((teamId) => delete teamProjectsByTeamId[teamId])
    Object.keys(teamMembersByTeamId).forEach((teamId) => delete teamMembersByTeamId[teamId])
    resetLoadState(currentUserLoadState)
    resetLoadState(teamsLoadState)
    bootstrapPromise = null
    teamsPromise = null
    teamsRevision += 1
    projectPromises.clear()
    memberPromises.clear()
    projectRevisions.clear()
    memberRevisions.clear()
  }

  const isSessionActive = (epoch: number, actorId: string) => (
    sessionEpoch.value === epoch && currentUser.value?.id === actorId
  )

  const isProjectRequestActive = (
    teamId: string,
    epoch: number,
    actorId: string,
    revision: number,
  ) => (
    isSessionActive(epoch, actorId)
    && teamById.value.has(teamId)
    && (projectRevisions.get(teamId) ?? 0) === revision
  )

  const isMemberRequestActive = (
    teamId: string,
    epoch: number,
    actorId: string,
    revision: number,
  ) => (
    isSessionActive(epoch, actorId)
    && teamById.value.has(teamId)
    && (memberRevisions.get(teamId) ?? 0) === revision
  )

  const normalizeTeams = (values: unknown) => {
    if (!Array.isArray(values)) return []
    return uniqueById(values.map((value) => normalizeTeamWire(value)).filter((value) => value !== null))
  }

  const pruneMissingTeams = (nextTeams: TeamContext[]) => {
    const nextIds = new Set(nextTeams.map((team) => team.id))
    const knownIds = new Set([
      ...teams.value.map((team) => team.id),
      ...Object.keys(teamProjectsByTeamId),
      ...Object.keys(teamMembersByTeamId),
    ])

    knownIds.forEach((teamId) => {
      if (!nextIds.has(teamId)) {
        invalidateTeamProjectsById(teamId)
        invalidateTeamMembersById(teamId)
      }
    })
  }

  const refreshMyTeams = (options: { force?: boolean } = {}): Promise<TeamContext[]> => {
    if (teamsPromise && !options.force) return teamsPromise
    if (options.force) {
      teamsRevision += 1
      teamsPromise = null
    }
    const actorId = currentUser.value?.id
    if (!actorId) return Promise.reject(new Error('Current user context is not initialized'))

    const epoch = sessionEpoch.value
    const revision = teamsRevision
    setLoading(teamsLoadState)

    const requestPromise = (async () => {
      try {
        const response = await fetchMyTeamsApi()
        if (!isSessionActive(epoch, actorId) || revision !== teamsRevision) return teams.value

        const nextTeams = normalizeTeams(response)
        pruneMissingTeams(nextTeams)
        teams.value = nextTeams
        setReady(teamsLoadState)
        return nextTeams
      } catch (error) {
        if (!isSessionActive(epoch, actorId) || revision !== teamsRevision) return teams.value

        const kind = classifyApiError(error)
        if (kind === 'AUTHENTICATION_REQUIRED') {
          clearCollaborationContext()
        } else if (kind === 'PERMISSION_DENIED') {
          teams.value = []
          Object.keys(teamProjectsByTeamId).forEach(invalidateTeamProjectsById)
          Object.keys(teamMembersByTeamId).forEach(invalidateTeamMembersById)
          setError(teamsLoadState, error)
        } else {
          setError(teamsLoadState, error)
        }
        throw error
      }
    })()

    teamsPromise = requestPromise
    void requestPromise.finally(() => {
      if (teamsPromise === requestPromise) teamsPromise = null
    }).catch(() => undefined)
    return requestPromise
  }

  const bootstrapCollaborationContext = (
    options: { force?: boolean } = {},
  ): Promise<CollaborationSnapshot> => {
    if (bootstrapPromise) return bootstrapPromise
    if (!options.force && currentUser.value && teamsLoadState.status === 'ready') {
      return Promise.resolve({ currentUser: currentUser.value, teams: teams.value })
    }

    const startingEpoch = sessionEpoch.value
    setLoading(currentUserLoadState)

    const requestPromise = (async () => {
      try {
        const response = await getUserMeApi()
        if (sessionEpoch.value !== startingEpoch) {
          if (!currentUser.value) throw new Error('Collaboration context changed during initialization')
          return { currentUser: currentUser.value, teams: teams.value }
        }

        const nextUser = normalizeCurrentUserWire(response)
        if (!nextUser) {
          clearCollaborationContext()
          throw new TypeError('Invalid current user response')
        }

        if (currentUser.value && currentUser.value.id !== nextUser.id) {
          resetProtectedSessionState('ACTOR_CHANGED')
        }
        setActiveCacheActor(nextUser.id)
        currentUser.value = nextUser
        setReady(currentUserLoadState)

        await refreshMyTeams()
        if (!currentUser.value) throw new Error('Collaboration context is no longer available')
        return { currentUser: currentUser.value, teams: teams.value }
      } catch (error) {
        const kind = classifyApiError(error)
        if (kind === 'AUTHENTICATION_REQUIRED') {
          clearCollaborationContext()
        } else if (currentUser.value === null && currentUserLoadState.status !== 'idle') {
          setError(currentUserLoadState, error)
        } else if (currentUserLoadState.status === 'loading') {
          setError(currentUserLoadState, error)
        }
        throw error
      }
    })()

    bootstrapPromise = requestPromise
    void requestPromise.finally(() => {
      if (bootstrapPromise === requestPromise) bootstrapPromise = null
    }).catch(() => undefined)
    return requestPromise
  }

  const recoverScopedAccess = async (teamId: string) => {
    pruneTeamContextById(teamId)
    if (!currentUser.value) return
    try {
      await refreshMyTeams()
    } catch {
      // The original resource error remains authoritative for the caller.
    }
  }

  const loadProjectPage = (
    teamId: string,
    pageNum: number,
    replace: boolean,
  ): Promise<ProjectContext[]> => {
    const existingPromise = projectPromises.get(teamId)
    if (existingPromise) return existingPromise
    const actorId = currentUser.value?.id
    if (!actorId) return Promise.reject(new Error('Current user context is not initialized'))
    if (!teamById.value.has(teamId)) return Promise.reject(new Error('Team context is not available'))

    const epoch = sessionEpoch.value
    const revision = projectRevisions.get(teamId) ?? 0
    if (!teamProjectsByTeamId[teamId]) {
      teamProjectsByTeamId[teamId] = createProjectBucket()
    }
    const bucket = teamProjectsByTeamId[teamId]!
    setLoading(bucket.loadState)

    const requestPromise = (async () => {
      try {
        const response = await fetchTeamProjectsApi({
          teamId,
          pageNum,
          pageSize: TEAM_PROJECT_PAGE_SIZE,
        })
        if (!isProjectRequestActive(teamId, epoch, actorId, revision)) {
          return teamProjectsByTeamId[teamId]?.records ?? []
        }

        const page = normalizePage(response)
        if (page.current !== pageNum) throw new TypeError('Unexpected team project page number')

        const nextRecords = uniqueById(page.records
          .map((value): ProjectContext | null => {
            const project = normalizeProjectWire(value)
            return project?.scope === 'TEAM' && project.teamId === teamId ? project : null
          })
          .filter((value): value is ProjectContext => value !== null))
        const records = replace ? nextRecords : uniqueById([...bucket.records, ...nextRecords])

        bucket.records = records
        bucket.current = page.current
        bucket.size = page.size
        bucket.total = page.total
        bucket.hasMore = page.current * page.size < page.total
        setReady(bucket.loadState)
        return records
      } catch (error) {
        if (!isProjectRequestActive(teamId, epoch, actorId, revision)) {
          return teamProjectsByTeamId[teamId]?.records ?? []
        }

        const kind = classifyApiError(error)
        if (kind === 'AUTHENTICATION_REQUIRED') {
          clearCollaborationContext()
        } else if (isScopedAccessError(kind)) {
          await recoverScopedAccess(teamId)
        } else {
          setError(bucket.loadState, error)
        }
        throw error
      }
    })()

    projectPromises.set(teamId, requestPromise)
    void requestPromise.finally(() => {
      if (projectPromises.get(teamId) === requestPromise) projectPromises.delete(teamId)
    }).catch(() => undefined)
    return requestPromise
  }

  const ensureTeamProjects = (
    rawTeamId: EntityId,
    options: { force?: boolean } = {},
  ) => {
    const teamId = normalizeRequiredId(rawTeamId, 'teamId')
    if (!teamById.value.has(teamId)) return Promise.reject(new Error('Team context is not available'))
    const bucket = teamProjectsByTeamId[teamId]
    if (!options.force && bucket?.loadState.status === 'ready') {
      return Promise.resolve(bucket.records)
    }
    if (options.force) {
      bumpRevision(projectRevisions, teamId)
      projectPromises.delete(teamId)
      if (bucket) setLoading(bucket.loadState)
    }
    return loadProjectPage(teamId, 1, true)
  }

  const loadMoreTeamProjects = (rawTeamId: EntityId) => {
    const teamId = normalizeRequiredId(rawTeamId, 'teamId')
    const bucket = teamProjectsByTeamId[teamId]
    if (!bucket || bucket.current < 1) return ensureTeamProjects(teamId)
    if (!bucket.hasMore) return Promise.resolve(bucket.records)
    return loadProjectPage(teamId, bucket.current + 1, false)
  }

  const ensureTeamMembers = (
    rawTeamId: EntityId,
    options: { force?: boolean } = {},
  ): Promise<TeamMemberContext[]> => {
    const teamId = normalizeRequiredId(rawTeamId, 'teamId')
    if (!teamById.value.has(teamId)) return Promise.reject(new Error('Team context is not available'))
    const cached = teamMembersByTeamId[teamId]
    if (!options.force && cached?.loadState.status === 'ready') {
      return Promise.resolve(cached.records)
    }
    const existingPromise = memberPromises.get(teamId)
    if (existingPromise && !options.force) return existingPromise
    if (options.force) {
      bumpRevision(memberRevisions, teamId)
      memberPromises.delete(teamId)
      if (cached) setLoading(cached.loadState)
    }

    const actorId = currentUser.value?.id
    if (!actorId) return Promise.reject(new Error('Current user context is not initialized'))
    const epoch = sessionEpoch.value
    const revision = memberRevisions.get(teamId) ?? 0
    if (!cached) {
      teamMembersByTeamId[teamId] = createMemberBucket()
    }
    const bucket = teamMembersByTeamId[teamId]!
    setLoading(bucket.loadState)

    const settleDiscardedRequest = () => {
      const activeBucket = teamMembersByTeamId[teamId]
      if (!activeBucket) return
      if ((memberRevisions.get(teamId) ?? 0) !== revision) return
      if (activeBucket.loadState.status === 'loading') resetLoadState(activeBucket.loadState)
    }

    const requestPromise = (async () => {
      try {
        const response = await fetchTeamMembersApi(teamId)
        if (!isMemberRequestActive(teamId, epoch, actorId, revision)) {
          settleDiscardedRequest()
          return teamMembersByTeamId[teamId]?.records ?? []
        }

        const records = Array.isArray(response)
          ? uniqueMembers(response
              .map((value) => normalizeTeamMemberWire(value, teamId))
              .filter((value) => value !== null))
          : []
        bucket.records = records
        setReady(bucket.loadState)
        return records
      } catch (error) {
        if (!isMemberRequestActive(teamId, epoch, actorId, revision)) {
          settleDiscardedRequest()
          return teamMembersByTeamId[teamId]?.records ?? []
        }

        const kind = classifyApiError(error)
        if (kind === 'AUTHENTICATION_REQUIRED') {
          clearCollaborationContext()
        } else if (isScopedAccessError(kind)) {
          await recoverScopedAccess(teamId)
        } else {
          setError(bucket.loadState, error)
        }
        throw error
      }
    })()

    memberPromises.set(teamId, requestPromise)
    void requestPromise.finally(() => {
      if (memberPromises.get(teamId) === requestPromise) memberPromises.delete(teamId)
    }).catch(() => undefined)
    return requestPromise
  }

  const restoreTeamProjectContext = async (
    rawTeamId: EntityId,
    rawProjectId: EntityId,
    options: { force?: boolean } = {},
  ): Promise<TeamProjectRestoreResult> => {
    const teamId = normalizeEntityId(rawTeamId)
    const projectId = normalizeEntityId(rawProjectId)
    if (!teamId || !projectId) return { kind: 'invalid-context' }

    try {
      if (!currentUser.value || teamsLoadState.status !== 'ready') {
        await bootstrapCollaborationContext()
      }
      const team = teamById.value.get(teamId)
      if (!team) return { kind: 'team-unavailable' }

      let records = await ensureTeamProjects(teamId, { force: options.force === true })
      let project = records.find((candidate) => candidate.id === projectId)
      while (!project && teamProjectsByTeamId[teamId]?.hasMore) {
        const previousPage = teamProjectsByTeamId[teamId]?.current ?? 0
        records = await loadMoreTeamProjects(teamId)
        const currentPage = teamProjectsByTeamId[teamId]?.current ?? 0
        if (currentPage <= previousPage) {
          return { kind: 'retryable-error', errorKind: 'UNKNOWN' }
        }
        project = records.find((candidate) => candidate.id === projectId)
      }

      return project
        ? { kind: 'ready', team, project }
        : { kind: 'project-unavailable' }
    } catch (error) {
      const kind = classifyApiError(error)
      if (kind === 'PERMISSION_DENIED') return { kind: 'team-unavailable' }
      if (kind === 'NOT_FOUND') {
        return teamById.value.has(teamId)
          ? { kind: 'project-unavailable' }
          : { kind: 'team-unavailable' }
      }
      return { kind: 'retryable-error', errorKind: kind }
    }
  }

  const invalidateTeamProjects = (rawTeamId: EntityId) => {
    invalidateTeamProjectsById(normalizeRequiredId(rawTeamId, 'teamId'))
  }

  const invalidateTeamMembers = (rawTeamId: EntityId) => {
    invalidateTeamMembersById(normalizeRequiredId(rawTeamId, 'teamId'))
  }

  const pruneTeamContext = (rawTeamId: EntityId) => {
    pruneTeamContextById(normalizeRequiredId(rawTeamId, 'teamId'))
  }

  const getTeam = (rawTeamId: EntityId) => {
    const teamId = normalizeEntityId(rawTeamId)
    return teamId ? teamById.value.get(teamId) ?? null : null
  }

  const getTeamProjects = (rawTeamId: EntityId) => {
    const teamId = normalizeEntityId(rawTeamId)
    return teamId ? teamProjectsByTeamId[teamId]?.records ?? [] : []
  }

  const getTeamMembers = (rawTeamId: EntityId) => {
    const teamId = normalizeEntityId(rawTeamId)
    return teamId ? teamMembersByTeamId[teamId]?.records ?? [] : []
  }

  const requireMutationActor = () => {
    const actorId = currentUser.value?.id
    if (!actorId) throw new Error('Current user context is not initialized')
    return { actorId, epoch: sessionEpoch.value }
  }

  const normalizeInvite = (value: { teamId?: EntityId; inviteCode?: string }): TeamInviteContext => {
    const teamId = normalizeRequiredId(value.teamId ?? '', 'teamId')
    const inviteCode = typeof value.inviteCode === 'string' ? value.inviteCode.trim() : ''
    if (!inviteCode) throw new TypeError('inviteCode must be a nonblank string')
    return { teamId, inviteCode }
  }

  const normalizeTermination = (value: {
    teamId?: EntityId
    memberUserId?: EntityId
    action?: string
    unassignedTaskCount?: number
    terminatedAt?: string
  }): TeamTerminationContext => ({
    teamId: normalizeRequiredId(value.teamId ?? '', 'teamId'),
    memberUserId: normalizeRequiredId(value.memberUserId ?? '', 'memberUserId'),
    action: typeof value.action === 'string' ? value.action : '',
    unassignedTaskCount: Number.isInteger(value.unassignedTaskCount) && Number(value.unassignedTaskCount) >= 0
      ? Number(value.unassignedTaskCount)
      : 0,
    terminatedAt: typeof value.terminatedAt === 'string' ? value.terminatedAt : null,
  })

  const createTeam = async (payload: TeamCreatePayload) => {
    const mutation = requireMutationActor()
    const result = normalizeInvite(await createTeamApi(payload))
    if (isSessionActive(mutation.epoch, mutation.actorId)) {
      await refreshMyTeams({ force: true })
    }
    return result
  }

  const joinTeam = async (inviteCode: string) => {
    const mutation = requireMutationActor()
    const previousIds = new Set(teams.value.map((team) => team.id))
    await joinTeamApi(inviteCode)
    if (!isSessionActive(mutation.epoch, mutation.actorId)) return null
    const refreshed = await refreshMyTeams({ force: true })
    return refreshed.find((team) => !previousIds.has(team.id))?.id ?? null
  }

  const updateTeam = async (payload: TeamUpdatePayload) => {
    const mutation = requireMutationActor()
    const teamId = normalizeRequiredId(payload.teamId, 'teamId')
    await updateTeamApi(payload)
    if (isSessionActive(mutation.epoch, mutation.actorId)) {
      await refreshMyTeams({ force: true })
    }
    return getTeam(teamId)
  }

  const loadTeamInvite = async (rawTeamId: EntityId) => normalizeInvite(
    await fetchTeamInviteApi(normalizeRequiredId(rawTeamId, 'teamId')),
  )

  const regenerateTeamInvite = async (rawTeamId: EntityId) => normalizeInvite(
    await regenerateTeamInviteApi(normalizeRequiredId(rawTeamId, 'teamId')),
  )

  const changeTeamMemberRole = async (
    rawTeamId: EntityId,
    rawTargetUserId: EntityId,
    role: Extract<TeamRole, 'ADMIN' | 'MEMBER'>,
  ) => {
    const mutation = requireMutationActor()
    const teamId = normalizeRequiredId(rawTeamId, 'teamId')
    await updateTeamMemberRoleApi(teamId, rawTargetUserId, role)
    if (isSessionActive(mutation.epoch, mutation.actorId) && teamById.value.has(teamId)) {
      invalidateTeamMembersById(teamId)
      await ensureTeamMembers(teamId, { force: true })
    }
  }

  const removeTeamMember = async (rawTeamId: EntityId, rawTargetUserId: EntityId) => {
    const mutation = requireMutationActor()
    const teamId = normalizeRequiredId(rawTeamId, 'teamId')
    const result = normalizeTermination(await removeTeamMemberApi(teamId, rawTargetUserId))
    if (isSessionActive(mutation.epoch, mutation.actorId) && teamById.value.has(teamId)) {
      invalidateTeamMembersById(teamId)
      await ensureTeamMembers(teamId, { force: true })
    }
    return result
  }

  const leaveTeam = async (rawTeamId: EntityId) => {
    const mutation = requireMutationActor()
    const teamId = normalizeRequiredId(rawTeamId, 'teamId')
    const result = normalizeTermination(await leaveTeamApi(teamId))
    if (isSessionActive(mutation.epoch, mutation.actorId)) {
      pruneTeamContextById(teamId)
      await refreshMyTeams({ force: true })
    }
    return result
  }

  const transferTeamOwnership = async (rawTeamId: EntityId, rawTargetUserId: EntityId) => {
    const mutation = requireMutationActor()
    const teamId = normalizeRequiredId(rawTeamId, 'teamId')
    const response = await transferTeamOwnershipApi(teamId, rawTargetUserId)
    const newOwnerUserId = normalizeRequiredId(response.newOwnerUserId ?? '', 'newOwnerUserId')
    if (isSessionActive(mutation.epoch, mutation.actorId)) {
      invalidateTeamMembersById(teamId)
      await refreshMyTeams({ force: true })
      if (teamById.value.has(teamId)) await ensureTeamMembers(teamId, { force: true })
    }
    return { teamId, newOwnerUserId, transferredAt: response.transferredAt ?? null }
  }

  const checkTeamDissolution = async (rawTeamId: EntityId): Promise<TeamDissolutionCheckContext> => {
    const teamId = normalizeRequiredId(rawTeamId, 'teamId')
    const response = await fetchTeamDissolutionCheckApi(teamId)
    return {
      teamId: normalizeRequiredId(response.teamId ?? '', 'teamId'),
      canDissolve: response.canDissolve === true,
      activeProjectCount: Number.isInteger(response.activeProjectCount) && Number(response.activeProjectCount) >= 0
        ? Number(response.activeProjectCount)
        : 0,
      sharedReviewCount: Number.isInteger(response.sharedReviewCount) && Number(response.sharedReviewCount) >= 0
        ? Number(response.sharedReviewCount)
        : 0,
    }
  }

  const dissolveTeam = async (rawTeamId: EntityId) => {
    const mutation = requireMutationActor()
    const teamId = normalizeRequiredId(rawTeamId, 'teamId')
    const response = await dissolveTeamApi(teamId)
    const dissolvedTeamId = normalizeRequiredId(response.teamId ?? '', 'teamId')
    if (isSessionActive(mutation.epoch, mutation.actorId)) {
      pruneTeamContextById(teamId)
      await refreshMyTeams({ force: true })
    }
    return {
      teamId: dissolvedTeamId,
      dissolvedAt: response.dissolvedAt ?? null,
      removedMemberCount: Number.isInteger(response.removedMemberCount)
        ? Number(response.removedMemberCount)
        : 0,
    }
  }

  return {
    currentUser,
    teams,
    teamProjectsByTeamId,
    teamMembersByTeamId,
    currentUserLoadState,
    teamsLoadState,
    sessionEpoch,
    bootstrapCollaborationContext,
    refreshMyTeams,
    ensureTeamProjects,
    loadMoreTeamProjects,
    ensureTeamMembers,
    restoreTeamProjectContext,
    invalidateTeamProjects,
    invalidateTeamMembers,
    pruneTeamContext,
    clearCollaborationContext,
    getTeam,
    getTeamProjects,
    getTeamMembers,
    createTeam,
    joinTeam,
    updateTeam,
    loadTeamInvite,
    regenerateTeamInvite,
    changeTeamMemberRole,
    removeTeamMember,
    leaveTeam,
    transferTeamOwnership,
    checkTeamDissolution,
    dissolveTeam,
  }
})
