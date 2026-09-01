import { watch } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import type { WirePage } from '@/types/common'
import type { ProjectContext, ProjectWire } from '@/types/project'
import type { TaskWire } from '@/types/task'
import { useWeeklyReviewAssociations, type TeamProjectSource } from './useWeeklyReviewAssociations'

const projectWire = (
  id: number,
  scope: 'PERSONAL' | 'TEAM',
  teamId: number | null = null,
): ProjectWire => ({
  id,
  userId: 7,
  teamId,
  scope,
  name: `Project ${id}`,
})

const taskWire = (id: number, projectId: number): TaskWire => ({
  id,
  projectId,
  createdByUserId: 7,
  title: `Task ${id}`,
  status: 0,
})

const teamProject = (id: string, teamId: string): ProjectContext => ({
  id,
  ownerUserId: '7',
  teamId,
  name: `Team project ${id}`,
  goal: '',
  scope: 'TEAM',
  status: 0,
  orderNo: null,
  icon: null,
  color: null,
  startDate: null,
  endDate: null,
  createTime: null,
  updateTime: null,
})

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

const privateContext = {
  reviewKey: 'draft:2026:36',
  visibilityScope: 'PRIVATE' as const,
  teamId: null,
}

describe('useWeeklyReviewAssociations', () => {
  it('loads and normalizes PRIVATE projects, then lazily loads project tasks', async () => {
    const fetchProjects = vi.fn(async () => ({
      records: [
        projectWire(1, 'PERSONAL'),
        projectWire(2, 'TEAM', 8),
        { ...projectWire(3, 'PERSONAL'), scope: 'UNKNOWN' },
        projectWire(1, 'PERSONAL'),
      ],
      current: 1,
      size: 100,
      total: 3,
    }))
    const fetchTasks = vi.fn(async () => ({
      records: [taskWire(11, 1), taskWire(12, 1), taskWire(99, 999)],
      current: 1,
      size: 100,
      total: 2,
    }))
    const associations = useWeeklyReviewAssociations({ fetchProjects, fetchTasks })

    associations.setContext(privateContext)
    await associations.ensureProjects()
    expect(associations.projects.value.map((project) => project.id)).toEqual(['1', '2'])

    await associations.ensureProjectTasks('1')
    expect(fetchTasks).toHaveBeenCalledWith({ projectId: '1', current: 1, size: 100 })
    expect(associations.getProjectTasks('1').map((task) => task.id)).toEqual(['11', '12'])
    expect(associations.getProjectTasks('999')).toEqual([])
  })

  it('publishes new task-bucket records through the reactive proxy', async () => {
    const fetchProjects = vi.fn(async () => ({
      records: [projectWire(1, 'PERSONAL')],
      current: 1,
      size: 100,
      total: 1,
    }))
    const fetchTasks = vi.fn(async () => ({
      records: [taskWire(11, 1)],
      current: 1,
      size: 100,
      total: 1,
    }))
    const associations = useWeeklyReviewAssociations({ fetchProjects, fetchTasks })
    const observedLengths: number[] = []
    const stop = watch(
      () => associations.taskBucketsByProjectId['1']?.records.length ?? -1,
      (length) => observedLengths.push(length),
      { flush: 'sync' },
    )

    associations.setContext(privateContext)
    await associations.ensureProjects()
    await associations.ensureProjectTasks('1')

    expect(observedLengths).toContain(1)
    stop()
  })

  it('keeps project pagination deduplicated and loads the next task page explicitly', async () => {
    const projectPages: WirePage<ProjectWire>[] = [
      { records: [projectWire(1, 'PERSONAL')], current: 1, size: 1, total: 2 },
      { records: [projectWire(1, 'PERSONAL'), projectWire(2, 'PERSONAL')], current: 2, size: 1, total: 2 },
    ]
    const taskPages: WirePage<TaskWire>[] = [
      { records: [taskWire(11, 1)], current: 1, size: 1, total: 2 },
      { records: [taskWire(12, 1)], current: 2, size: 1, total: 2 },
    ]
    const fetchProjects = vi.fn(async ({ pageNum = 1 }: { pageNum?: number } = {}) => projectPages[pageNum - 1]!)
    const fetchTasks = vi.fn(async ({ current = 1 }: { current?: number } = {}) => taskPages[current - 1]!)
    const associations = useWeeklyReviewAssociations({ fetchProjects, fetchTasks, pageSize: 1 })

    associations.setContext(privateContext)
    await associations.ensureProjects()
    await associations.loadMoreProjects()
    expect(associations.projects.value.map((project) => project.id)).toEqual(['1', '2'])

    await associations.ensureProjectTasks('1')
    expect(associations.getProjectTasks('1').map((task) => task.id)).toEqual(['11'])
    await associations.loadMoreProjectTasks('1')
    expect(associations.getProjectTasks('1').map((task) => task.id)).toEqual(['11', '12'])
    expect(fetchTasks).toHaveBeenNthCalledWith(2, { projectId: '1', current: 2, size: 1 })
  })

  it('limits TEAM candidates to the selected team and reuses the collaboration source', async () => {
    const source: TeamProjectSource = {
      ensureTeamProjects: vi.fn(async () => [teamProject('10', '8'), teamProject('20', '9')]),
      loadMoreTeamProjects: vi.fn(async () => []),
      getTeamProjects: vi.fn(() => []),
      getTeam: vi.fn(() => ({ id: '8' })),
    }
    const associations = useWeeklyReviewAssociations({ teamProjects: source })

    associations.setContext({ reviewKey: 'review:31', visibilityScope: 'TEAM', teamId: '8' })
    await associations.ensureProjects()

    expect(source.ensureTeamProjects).toHaveBeenCalledWith('8', {})
    expect(associations.projects.value.map((project) => project.id)).toEqual(['10'])
  })

  it('drops stale project responses after a context switch', async () => {
    const first = deferred<WirePage<ProjectWire>>()
    const second = deferred<WirePage<ProjectWire>>()
    const fetchProjects = vi.fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    const associations = useWeeklyReviewAssociations({ fetchProjects })

    associations.setContext(privateContext)
    const firstRequest = associations.ensureProjects()
    associations.setContext({ ...privateContext, reviewKey: 'review:32' })
    const secondRequest = associations.ensureProjects()

    second.resolve({ records: [projectWire(2, 'PERSONAL')], current: 1, size: 100, total: 1 })
    await secondRequest
    first.resolve({ records: [projectWire(1, 'PERSONAL')], current: 1, size: 100, total: 1 })
    await firstRequest

    expect(associations.projects.value.map((project) => project.id)).toEqual(['2'])
    expect(associations.contextRevision.value).toBe(2)
  })

  it('does not let a force-reloaded project request overwrite the newer result', async () => {
    const first = deferred<WirePage<ProjectWire>>()
    const second = deferred<WirePage<ProjectWire>>()
    const fetchProjects = vi.fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    const associations = useWeeklyReviewAssociations({ fetchProjects })

    associations.setContext(privateContext)
    const firstRequest = associations.ensureProjects()
    const secondRequest = associations.retryProjects()

    second.resolve({ records: [projectWire(2, 'PERSONAL')], current: 1, size: 100, total: 1 })
    await secondRequest
    first.resolve({ records: [projectWire(1, 'PERSONAL')], current: 1, size: 100, total: 1 })
    await firstRequest

    expect(associations.projects.value.map((project) => project.id)).toEqual(['2'])
  })

  it('drops stale task responses after reset without creating a ghost bucket', async () => {
    const fetchProjects = vi.fn(async () => ({ records: [projectWire(1, 'PERSONAL')], current: 1, size: 100, total: 1 }))
    const taskResponse = deferred<WirePage<TaskWire>>()
    const fetchTasks = vi.fn(() => taskResponse.promise)
    const associations = useWeeklyReviewAssociations({ fetchProjects, fetchTasks })

    associations.setContext(privateContext)
    await associations.ensureProjects()
    const taskRequest = associations.ensureProjectTasks('1')
    associations.resetContext()
    taskResponse.resolve({ records: [taskWire(11, 1)], current: 1, size: 100, total: 1 })
    await taskRequest

    expect(associations.projects.value).toEqual([])
    expect(associations.taskBucketsByProjectId).toEqual({})
  })

  it('does not let a force-reloaded task request overwrite the newer result', async () => {
    const fetchProjects = vi.fn(async () => ({ records: [projectWire(1, 'PERSONAL')], current: 1, size: 100, total: 1 }))
    const first = deferred<WirePage<TaskWire>>()
    const second = deferred<WirePage<TaskWire>>()
    const fetchTasks = vi.fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    const associations = useWeeklyReviewAssociations({ fetchProjects, fetchTasks })

    associations.setContext(privateContext)
    await associations.ensureProjects()
    const firstRequest = associations.ensureProjectTasks('1')
    const secondRequest = associations.retryProjectTasks('1')

    second.resolve({ records: [taskWire(12, 1)], current: 1, size: 100, total: 1 })
    await secondRequest
    first.resolve({ records: [taskWire(11, 1)], current: 1, size: 100, total: 1 })
    await firstRequest

    expect(associations.getProjectTasks('1').map((task) => task.id)).toEqual(['12'])
  })
})
