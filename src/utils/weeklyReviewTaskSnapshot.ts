import {
  fetchProjectList,
  fetchTeamProjectsApi,
  type ProjectListParams,
  type TeamProjectListParams,
} from '@/api/project'
import { fetchTaskList, type TaskListParams } from '@/api/task'
import type { WirePage } from '@/types/common'
import { normalizeProjectWire, normalizeTaskWire } from '@/types/normalization'
import type { ProjectContext, ProjectWire } from '@/types/project'
import type { TaskModel, TaskWire } from '@/types/task'

const SNAPSHOT_PAGE_SIZE = 100
const MAX_PROJECT_PAGE_REQUESTS = 60
const MAX_TASK_PAGE_REQUESTS = 60

interface StrictPage<T> {
  records: T[]
  current: number
  size: number
  total: number
}

export interface WeeklyReviewTaskSnapshotLoaders {
  fetchPersonalProjects: (params: ProjectListParams) => Promise<WirePage<ProjectWire>>
  fetchTeamProjects: (params: TeamProjectListParams) => Promise<WirePage<ProjectWire>>
  fetchTasks: (params: TaskListParams) => Promise<WirePage<TaskWire>>
}

export interface WeeklyReviewTaskSnapshotOptions {
  teamIds: string[]
  isActive: () => boolean
  loaders?: WeeklyReviewTaskSnapshotLoaders
}

export type WeeklyReviewTaskSnapshotResult =
  | {
      complete: true
      projectIds: string[]
      tasks: TaskModel[]
    }
  | {
      complete: false
      projectIds: []
      tasks: []
      reason: string
    }

const defaultLoaders: WeeklyReviewTaskSnapshotLoaders = {
  fetchPersonalProjects: async (params) => await fetchProjectList(params),
  fetchTeamProjects: async (params) => await fetchTeamProjectsApi(params),
  fetchTasks: async (params) => await fetchTaskList(params),
}

const incomplete = (reason: string): WeeklyReviewTaskSnapshotResult => ({
  complete: false,
  projectIds: [],
  tasks: [],
  reason,
})

const normalizeStrictInteger = (value: unknown, minimum: number) => {
  const candidate = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : Number.NaN
  return Number.isSafeInteger(candidate) && candidate >= minimum ? candidate : null
}

const normalizeStrictPage = <T>(value: WirePage<T>, expectedPage: number): StrictPage<T> | null => {
  if (!Array.isArray(value?.records)) return null
  const current = normalizeStrictInteger(value.current, 1)
  const size = normalizeStrictInteger(value.size, 1)
  const total = normalizeStrictInteger(value.total, 0)
  if (current !== expectedPage || size === null || total === null) return null
  if (value.records.length > size) return null
  return { records: value.records, current, size, total }
}

const uniqueStable = <T extends { id: string }>(values: T[]) => {
  const seen = new Set<string>()
  return values.filter((value) => {
    if (seen.has(value.id)) return false
    seen.add(value.id)
    return true
  })
}

const loadProjectScope = async (
  fetchPage: (page: number) => Promise<WirePage<ProjectWire>>,
  normalizeProject: (value: ProjectWire) => ProjectContext | null,
  requestBudget: { used: number },
  isActive: () => boolean,
): Promise<ProjectContext[] | null> => {
  const projects: ProjectContext[] = []
  let pageNumber = 1
  let expectedTotal: number | null = null

  while (isActive()) {
    if (requestBudget.used >= MAX_PROJECT_PAGE_REQUESTS) return null
    requestBudget.used += 1

    const response = await fetchPage(pageNumber)
    if (!isActive()) return null
    const page = normalizeStrictPage(response, pageNumber)
    if (!page || (expectedTotal !== null && page.total !== expectedTotal)) return null
    expectedTotal = page.total

    const normalized = page.records.map(normalizeProject)
    if (normalized.some((project) => project === null)) return null
    projects.push(...normalized.filter((project): project is ProjectContext => project !== null))

    const receivedCount = projects.length
    if (receivedCount >= page.total) {
      return receivedCount === page.total ? projects : null
    }
    if (page.records.length === 0) return null
    pageNumber += 1
  }

  return null
}

const loadAllProjects = async (
  teamIds: string[],
  loaders: WeeklyReviewTaskSnapshotLoaders,
  isActive: () => boolean,
) => {
  const requestBudget = { used: 0 }
  const projects: ProjectContext[] = []
  const personalProjects = await loadProjectScope(
    (pageNum) => loaders.fetchPersonalProjects({ status: 0, pageNum, pageSize: SNAPSHOT_PAGE_SIZE }),
    (project) => {
      const normalized = normalizeProjectWire(project)
      return normalized?.scope === 'PERSONAL' ? normalized : null
    },
    requestBudget,
    isActive,
  )
  if (!personalProjects) return null
  projects.push(...personalProjects)

  for (const teamId of Array.from(new Set(teamIds))) {
    if (!isActive()) return null
    const teamProjects = await loadProjectScope(
      (pageNum) => loaders.fetchTeamProjects({
        teamId,
        status: 0,
        pageNum,
        pageSize: SNAPSHOT_PAGE_SIZE,
      }),
      (project) => {
        const normalized = normalizeProjectWire(project)
        return normalized?.scope === 'TEAM' && normalized.teamId === teamId ? normalized : null
      },
      requestBudget,
      isActive,
    )
    if (!teamProjects) return null
    projects.push(...teamProjects)
  }

  const uniqueProjects = uniqueStable(projects)
  return uniqueProjects.length === projects.length ? uniqueProjects : null
}

const loadAllTasks = async (
  projectIds: string[],
  loaders: WeeklyReviewTaskSnapshotLoaders,
  isActive: () => boolean,
) => {
  const requestBudget = { used: 0 }
  const tasks: TaskModel[] = []

  for (const projectId of projectIds) {
    let pageNumber = 1
    let expectedTotal: number | null = null
    let receivedForProject = 0

    while (isActive()) {
      if (requestBudget.used >= MAX_TASK_PAGE_REQUESTS) return null
      requestBudget.used += 1

      const response = await loaders.fetchTasks({
        projectId,
        current: pageNumber,
        size: SNAPSHOT_PAGE_SIZE,
      })
      if (!isActive()) return null
      const page = normalizeStrictPage(response, pageNumber)
      if (!page || (expectedTotal !== null && page.total !== expectedTotal)) return null
      expectedTotal = page.total

      const normalized = page.records.map((task) => normalizeTaskWire(task))
      if (normalized.some((task) => task === null || task.projectId !== projectId)) return null
      tasks.push(...normalized.filter((task): task is TaskModel => task !== null))
      receivedForProject += page.records.length

      if (receivedForProject >= page.total) {
        if (receivedForProject !== page.total) return null
        break
      }
      if (page.records.length === 0) return null
      pageNumber += 1
    }

    if (!isActive()) return null
  }

  const uniqueTasks = uniqueStable(tasks)
  return uniqueTasks.length === tasks.length ? uniqueTasks : null
}

export const loadWeeklyReviewTaskSnapshot = async (
  options: WeeklyReviewTaskSnapshotOptions,
): Promise<WeeklyReviewTaskSnapshotResult> => {
  const { isActive } = options
  if (!isActive()) return incomplete('统计上下文已变化，已忽略过期任务快照。')

  try {
    const loaders = options.loaders ?? defaultLoaders
    const projects = await loadAllProjects(options.teamIds, loaders, isActive)
    if (!isActive()) return incomplete('统计上下文已变化，已忽略过期任务快照。')
    if (!projects) return incomplete('项目数据不完整，辅助完成率暂不展示。')

    const projectIds = projects.map((project) => project.id)
    const tasks = await loadAllTasks(projectIds, loaders, isActive)
    if (!isActive()) return incomplete('统计上下文已变化，已忽略过期任务快照。')
    if (!tasks) return incomplete('任务数据不完整，辅助完成率暂不展示。')

    return { complete: true, projectIds, tasks }
  } catch (error) {
    if (!isActive()) return incomplete('统计上下文已变化，已忽略过期任务快照。')
    console.error('加载周复盘任务快照失败', error)
    return incomplete('辅助任务数据暂时不可用，服务端周复盘统计仍然有效。')
  }
}
