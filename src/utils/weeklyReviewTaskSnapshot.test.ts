import { describe, expect, it, vi } from 'vitest'

import type { WirePage } from '@/types/common'
import type { ProjectWire } from '@/types/project'
import type { TaskWire } from '@/types/task'
import {
  loadWeeklyReviewTaskSnapshot,
  type WeeklyReviewTaskSnapshotLoaders,
} from './weeklyReviewTaskSnapshot'

const project = (id: number, teamId: number | null = null): ProjectWire => ({
  id,
  userId: 1,
  teamId,
  name: `project-${id}`,
  status: 0,
})

const task = (id: number, projectId: number, assigneeUserId = 1): TaskWire => ({
  id,
  projectId,
  createdByUserId: 1,
  assigneeUserId,
  title: `task-${id}`,
  status: 2,
  dueDate: '2026-09-01',
})

const page = <T>(records: T[], current = 1, size = 100, total = records.length): WirePage<T> => ({
  records,
  current,
  size,
  total,
})

const createLoaders = (
  overrides: Partial<WeeklyReviewTaskSnapshotLoaders> = {},
): WeeklyReviewTaskSnapshotLoaders => ({
  fetchPersonalProjects: vi.fn(async () => page<ProjectWire>([])),
  fetchTeamProjects: vi.fn(async () => page<ProjectWire>([])),
  fetchTasks: vi.fn(async () => page<TaskWire>([])),
  ...overrides,
})

describe('weekly review complete task snapshot', () => {
  it('paginates personal projects and includes projects from every active team', async () => {
    const fetchPersonalProjects = vi.fn(async ({ pageNum }: Record<string, unknown>) => (
      pageNum === 1 ? page([project(10)], 1, 1, 2) : page([project(11)], 2, 1, 2)
    ))
    const fetchTeamProjects = vi.fn(async ({ teamId }: { teamId: string | number }) => (
      page([project(Number(teamId) * 10, Number(teamId))])
    ))
    const fetchTasks = vi.fn(async ({ projectId }: { projectId?: string | number }) => (
      page([task(Number(projectId) + 1000, Number(projectId))])
    ))

    const result = await loadWeeklyReviewTaskSnapshot({
      teamIds: ['20', '30'],
      isActive: () => true,
      loaders: createLoaders({ fetchPersonalProjects, fetchTeamProjects, fetchTasks }),
    })

    expect(result.complete).toBe(true)
    if (!result.complete) return
    expect(result.projectIds).toEqual(['10', '11', '200', '300'])
    expect(result.tasks.map((value) => value.projectId)).toEqual(['10', '11', '200', '300'])
    expect(fetchPersonalProjects).toHaveBeenCalledTimes(2)
    expect(fetchTeamProjects).toHaveBeenCalledTimes(2)
  })

  it('fails closed and returns no partial tasks when page metadata is incomplete', async () => {
    const loaders = createLoaders({
      fetchPersonalProjects: vi.fn(async () => ({
        records: [project(10)],
        current: 1,
        size: 100,
      })),
    })

    const result = await loadWeeklyReviewTaskSnapshot({
      teamIds: [],
      isActive: () => true,
      loaders,
    })

    expect(result).toEqual({
      complete: false,
      projectIds: [],
      tasks: [],
      reason: '项目数据不完整，辅助完成率暂不展示。',
    })
    expect(loaders.fetchTasks).not.toHaveBeenCalled()
  })

  it('discards a late snapshot after the actor session becomes inactive', async () => {
    let active = true
    const loaders = createLoaders({
      fetchPersonalProjects: vi.fn(async () => {
        active = false
        return page([project(10)])
      }),
    })

    const result = await loadWeeklyReviewTaskSnapshot({
      teamIds: [],
      isActive: () => active,
      loaders,
    })

    expect(result.complete).toBe(false)
    expect(result.tasks).toEqual([])
  })
})
