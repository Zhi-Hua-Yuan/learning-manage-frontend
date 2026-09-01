import { computed, reactive, ref } from 'vue'

import { fetchProjectList } from '@/api/project'
import { fetchTaskList } from '@/api/task'
import { useCollaborationStore } from '@/stores/collaboration'
import type { PageResult } from '@/types/common'
import type { ProjectContext, ProjectWire } from '@/types/project'
import type { TaskModel, TaskWire } from '@/types/task'
import {
  normalizePage,
  normalizeProjectWire,
  normalizeTaskWire,
  normalizeEntityId,
} from '@/types/normalization'
import { classifyApiError, type ApiErrorKind } from '@/utils/request'

const DEFAULT_PAGE_SIZE = 100

export type ReviewAssociationVisibilityScope = 'PRIVATE' | 'TEAM'

export interface WeeklyReviewAssociationContext {
  reviewKey: string
  visibilityScope: ReviewAssociationVisibilityScope
  teamId: string | null
}

export type AssociationLoadStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface AssociationLoadState {
  status: AssociationLoadStatus
  errorKind: ApiErrorKind | null
  errorMessage: string | null
}

export interface ReviewTaskBucket {
  projectId: string
  records: TaskModel[]
  current: number
  size: number
  total: number
  hasMore: boolean
  loadState: AssociationLoadState
}

export type AssociationAccessSignal =
  | { kind: 'PROJECT_ACCESS_LOST'; teamId: string | null }
  | { kind: 'TASK_ACCESS_LOST'; projectId: string; teamId: string | null }

export interface TeamProjectSource {
  ensureTeamProjects: (teamId: string, options?: { force?: boolean }) => Promise<ProjectContext[]>
  loadMoreTeamProjects: (teamId: string) => Promise<ProjectContext[]>
  getTeamProjects: (teamId: string) => ProjectContext[]
  getTeam?: (teamId: string) => unknown
}

export interface WeeklyReviewAssociationDependencies {
  fetchProjects?: typeof fetchProjectList
  fetchTasks?: typeof fetchTaskList
  teamProjects?: TeamProjectSource
  pageSize?: number
}

const createLoadState = (): AssociationLoadState => ({
  status: 'idle',
  errorKind: null,
  errorMessage: null,
})

const createTaskBucket = (projectId: string, size: number): ReviewTaskBucket => ({
  projectId,
  records: [],
  current: 0,
  size,
  total: 0,
  hasMore: false,
  loadState: createLoadState(),
})

const uniqueById = <T extends { id: string }>(values: T[]) => {
  const seen = new Set<string>()
  return values.filter((value) => {
    if (seen.has(value.id)) return false
    seen.add(value.id)
    return true
  })
}

const normalizeProjectRecords = (records: ProjectWire[]) => {
  const normalized = records
    .map((record) => normalizeProjectWire(record))
    .filter((record) => record !== null) as ProjectContext[]
  return uniqueById<ProjectContext>(normalized)
}

const normalizeTaskRecords = (records: TaskWire[], projectId: string) => (
  uniqueById(
    records
      .map((record) => normalizeTaskWire(record))
      .filter((record): record is TaskModel => record !== null && record.projectId === projectId),
  )
)

const setLoading = (state: AssociationLoadState) => {
  state.status = 'loading'
  state.errorKind = null
  state.errorMessage = null
}

const setReady = (state: AssociationLoadState) => {
  state.status = 'ready'
  state.errorKind = null
  state.errorMessage = null
}

const setError = (state: AssociationLoadState, error: unknown) => {
  state.status = 'error'
  state.errorKind = classifyApiError(error)
  state.errorMessage = error instanceof Error ? error.message : '请求失败'
}

const isScopedAccessError = (kind: ApiErrorKind) => (
  kind === 'PERMISSION_DENIED' || kind === 'NOT_FOUND'
)

export function useWeeklyReviewAssociations(
  dependencies: WeeklyReviewAssociationDependencies = {},
) {
  const fetchProjects = dependencies.fetchProjects ?? fetchProjectList
  const fetchTasks = dependencies.fetchTasks ?? fetchTaskList
  const pageSize = dependencies.pageSize ?? DEFAULT_PAGE_SIZE
  let teamProjects = dependencies.teamProjects
  const getTeamProjectSource = () => {
    teamProjects ??= useCollaborationStore()
    return teamProjects
  }

  const activeContext = ref<WeeklyReviewAssociationContext | null>(null)
  const contextRevision = ref(0)
  const projects = ref<ProjectContext[]>([])
  const projectPage = reactive<PageResult<ProjectContext>>({
    records: [],
    current: 0,
    size: pageSize,
    total: 0,
  })
  const projectLoadState = reactive<AssociationLoadState>(createLoadState())
  const taskBucketsByProjectId = reactive<Record<string, ReviewTaskBucket>>({})
  const accessSignal = ref<AssociationAccessSignal | null>(null)
  const projectHasMore = ref(false)

  let projectPromise: Promise<ProjectContext[]> | null = null
  let projectRequestRevision = 0
  const taskPromises = new Map<string, Promise<TaskModel[]>>()
  const taskRequestRevisions = new Map<string, number>()

  const contextKey = computed(() => {
    const context = activeContext.value
    if (!context) return null
    return `${context.reviewKey}:${context.visibilityScope}:${context.teamId ?? '-'}`
  })

  const snapshot = () => ({
    revision: contextRevision.value,
    key: contextKey.value,
  })

  const isRequestActive = (request: { revision: number; key: string | null }) => (
    request.revision === contextRevision.value && request.key === contextKey.value
  )

  const clearCandidateState = () => {
    projects.value = []
    projectPage.records = []
    projectPage.current = 0
    projectPage.size = pageSize
    projectPage.total = 0
    projectHasMore.value = false
    Object.keys(taskBucketsByProjectId).forEach((projectId) => delete taskBucketsByProjectId[projectId])
    taskPromises.clear()
    taskRequestRevisions.clear()
    projectPromise = null
    projectLoadState.status = 'idle'
    projectLoadState.errorKind = null
    projectLoadState.errorMessage = null
    accessSignal.value = null
  }

  const clearProjectCandidates = () => {
    projects.value = []
    projectPage.records = []
    projectPage.current = 0
    projectPage.total = 0
    projectHasMore.value = false
    Object.keys(taskBucketsByProjectId).forEach((projectId) => delete taskBucketsByProjectId[projectId])
    taskPromises.clear()
    taskRequestRevisions.clear()
  }

  const setContext = (next: WeeklyReviewAssociationContext | null) => {
    contextRevision.value += 1
    activeContext.value = next
    clearCandidateState()
  }

  const resetContext = () => setContext(null)

  const isProjectInContext = (project: ProjectContext, context: WeeklyReviewAssociationContext) => {
    if (context.visibilityScope === 'TEAM') {
      return project.scope === 'TEAM' && project.teamId === context.teamId
    }
    return project.scope === 'PERSONAL' || project.scope === 'TEAM'
  }

  const mergeProjects = (records: ProjectContext[]) => {
    const merged = uniqueById([...projects.value, ...records])
    projects.value = merged
    projectPage.records = merged
    return merged
  }

  const ensureProjects = async (options: { force?: boolean } = {}) => {
    const context = activeContext.value
    if (!context) return []
    if (!options.force && projectLoadState.status === 'ready') return projects.value
    if (!options.force && projectPromise) return projectPromise

    if (options.force) clearProjectCandidates()
    const request = { ...snapshot(), requestRevision: ++projectRequestRevision }
    projectLoadState.status = 'loading'
    projectLoadState.errorKind = null
    projectLoadState.errorMessage = null
    accessSignal.value = null

    const requestPromise = (async () => {
      let records: ProjectContext[]
      if (context.visibilityScope === 'TEAM') {
        const source = getTeamProjectSource()
        if (!context.teamId || (source.getTeam && !source.getTeam(context.teamId))) {
          throw new Error('当前团队上下文不可用')
        }
        records = await source.ensureTeamProjects(context.teamId, options)
      } else {
        const response = await fetchProjects({ pageNum: 1, pageSize })
        const page = normalizePage(response)
        projectPage.current = page.current
        projectPage.size = page.size
        projectPage.total = page.total
        records = normalizeProjectRecords(page.records as ProjectWire[])
      }

      if (!isRequestActive(request) || request.requestRevision !== projectRequestRevision) return projects.value
      const scopedRecords = records.filter((record) => isProjectInContext(record, context))
      mergeProjects(scopedRecords)
      if (context.visibilityScope === 'TEAM') {
        projectPage.current = 1
        projectPage.size = pageSize
        projectPage.total = projects.value.length
        projectPage.records = projects.value
        projectHasMore.value = records.length >= pageSize
      } else {
        projectHasMore.value = projectPage.current * projectPage.size < projectPage.total
      }
      projectPage.total = Math.max(projectPage.total, projects.value.length)
      setReady(projectLoadState)
      projectPage.current = Math.max(projectPage.current, 1)
      return projects.value
    })()

    projectPromise = requestPromise
    void requestPromise
      .catch((error) => {
        if (isRequestActive(request) && request.requestRevision === projectRequestRevision) {
          setError(projectLoadState, error)
          if (projectLoadState.errorKind && isScopedAccessError(projectLoadState.errorKind)) {
            accessSignal.value = { kind: 'PROJECT_ACCESS_LOST', teamId: context.teamId }
          }
        }
        throw error
      })
      .finally(() => {
        if (projectPromise === requestPromise) projectPromise = null
      })
      .catch(() => undefined)
    return requestPromise
  }

  const loadMoreProjects = async () => {
    const context = activeContext.value
    if (!context) return []
    if (projectLoadState.status === 'loading') return projectPromise ?? projects.value
    if (context.visibilityScope === 'PRIVATE') {
      if (!projectHasMore.value) {
        return projects.value
      }
      const request = { ...snapshot(), requestRevision: ++projectRequestRevision }
      const nextPage = projectPage.current + 1
      projectLoadState.status = 'loading'
      try {
        const response = await fetchProjects({ pageNum: nextPage, pageSize })
        if (!isRequestActive(request) || request.requestRevision !== projectRequestRevision) return projects.value
        const page = normalizePage(response)
        const records = normalizeProjectRecords(page.records as ProjectWire[])
          .filter((record) => isProjectInContext(record, context))
        mergeProjects(records)
        projectPage.current = page.current
        projectPage.size = page.size
        projectPage.total = Math.max(page.total, projects.value.length)
        projectHasMore.value = page.current * page.size < page.total
        setReady(projectLoadState)
        return projects.value
      } catch (error) {
        if (isRequestActive(request) && request.requestRevision === projectRequestRevision) {
          setError(projectLoadState, error)
          if (projectLoadState.errorKind && isScopedAccessError(projectLoadState.errorKind)) {
            accessSignal.value = { kind: 'PROJECT_ACCESS_LOST', teamId: context.teamId }
          }
        }
        throw error
      }
    }

    if (!context.teamId) return []
    const request = { ...snapshot(), requestRevision: ++projectRequestRevision }
    projectLoadState.status = 'loading'
    const previousSize = projects.value.length
    try {
      const records = await getTeamProjectSource().loadMoreTeamProjects(context.teamId)
      if (!isRequestActive(request) || request.requestRevision !== projectRequestRevision) return projects.value
      mergeProjects(records.filter((record) => isProjectInContext(record, context)))
      projectPage.current += 1
      projectPage.total = projects.value.length
      projectPage.size = pageSize
      projectHasMore.value = projects.value.length > previousSize
      if (!projectHasMore.value) projectPage.current = 0
      setReady(projectLoadState)
      return projects.value
    } catch (error) {
      if (isRequestActive(request) && request.requestRevision === projectRequestRevision) {
        setError(projectLoadState, error)
        if (projectLoadState.errorKind && isScopedAccessError(projectLoadState.errorKind)) {
          accessSignal.value = { kind: 'PROJECT_ACCESS_LOST', teamId: context.teamId }
        }
      }
      throw error
    }
  }

  const getProject = (rawProjectId: string | number) => {
    const projectId = normalizeEntityId(rawProjectId)
    return projectId ? projects.value.find((project) => project.id === projectId) ?? null : null
  }

  const mergeTasks = (bucket: ReviewTaskBucket, records: TaskModel[]) => {
    bucket.records = uniqueById([...bucket.records, ...records])
    return bucket.records
  }

  const loadTaskPage = async (projectId: string, force = false, loadNext = false) => {
    const context = activeContext.value
    if (!context || !isRequestActive(snapshot()) || !getProject(projectId)) return []
    const existing = taskBucketsByProjectId[projectId]
    if (!force && !loadNext && existing?.loadState.status === 'ready') return existing.records
    if (!force && taskPromises.has(projectId)) return taskPromises.get(projectId) as Promise<TaskModel[]>

    const bucket = existing ?? createTaskBucket(projectId, pageSize)
    if (force) {
      bucket.records = []
      bucket.current = 0
      bucket.total = 0
      bucket.hasMore = false
    }
    taskBucketsByProjectId[projectId] = bucket
    const taskRevision = (taskRequestRevisions.get(projectId) ?? 0) + 1
    taskRequestRevisions.set(projectId, taskRevision)
    const request = { ...snapshot(), taskRevision }
    const pageNumber = bucket.current + 1
    setLoading(bucket.loadState)

    const requestPromise = (async () => {
      const response = await fetchTasks({ projectId, current: pageNumber, size: pageSize })
      if (!isRequestActive(request) || taskRequestRevisions.get(projectId) !== taskRevision) return bucket.records
      const page = normalizePage(response)
      const records = normalizeTaskRecords(page.records as TaskWire[], projectId)
      mergeTasks(bucket, records)
      bucket.current = page.current
      bucket.size = page.size
      bucket.total = Math.max(page.total, bucket.records.length)
      bucket.hasMore = bucket.current * bucket.size < bucket.total
      setReady(bucket.loadState)
      return bucket.records
    })()

    taskPromises.set(projectId, requestPromise)
    void requestPromise
      .catch((error) => {
        if (isRequestActive(request) && taskRequestRevisions.get(projectId) === taskRevision) {
          setError(bucket.loadState, error)
          if (bucket.loadState.errorKind && isScopedAccessError(bucket.loadState.errorKind)) {
            accessSignal.value = { kind: 'TASK_ACCESS_LOST', projectId, teamId: context.teamId }
          }
        }
        throw error
      })
      .finally(() => {
        if (taskPromises.get(projectId) === requestPromise) taskPromises.delete(projectId)
      })
      .catch(() => undefined)
    return requestPromise
  }

  const ensureProjectTasks = (rawProjectId: string | number, options: { force?: boolean } = {}) => {
    const projectId = normalizeEntityId(rawProjectId)
    if (!projectId) return Promise.reject(new TypeError('projectId must be a positive safe integer ID'))
    return loadTaskPage(projectId, options.force)
  }

  const loadMoreProjectTasks = (rawProjectId: string | number) => {
    const projectId = normalizeEntityId(rawProjectId)
    if (!projectId) return Promise.reject(new TypeError('projectId must be a positive safe integer ID'))
    const existing = taskBucketsByProjectId[projectId]
    if (existing?.loadState.status === 'ready' && !existing.hasMore) {
      return Promise.resolve(existing.records)
    }
    return loadTaskPage(projectId, false, true)
  }

  const getProjectTasks = (rawProjectId: string | number) => {
    const projectId = normalizeEntityId(rawProjectId)
    return projectId ? taskBucketsByProjectId[projectId]?.records ?? [] : []
  }

  const retryProjects = () => ensureProjects({ force: true })

  const retryProjectTasks = (projectId: string | number) => ensureProjectTasks(projectId, { force: true })

  return {
    activeContext,
    contextRevision,
    contextKey,
    projects,
    projectPage,
    projectHasMore,
    projectLoadState,
    taskBucketsByProjectId,
    accessSignal,
    setContext,
    resetContext,
    ensureProjects,
    loadMoreProjects,
    retryProjects,
    getProject,
    ensureProjectTasks,
    loadMoreProjectTasks,
    retryProjectTasks,
    getProjectTasks,
  }
}
