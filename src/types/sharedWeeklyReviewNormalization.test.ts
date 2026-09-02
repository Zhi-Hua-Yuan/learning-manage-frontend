import { describe, expect, it } from 'vitest'

import {
  normalizeSharedWeeklyReviewPage,
  normalizeSharedWeeklyReviewWire,
} from './normalization'

const TOP_LEVEL_WHITELIST = [
  'author',
  'createTime',
  'endDate',
  'focusProject',
  'id',
  'sharedSummary',
  'startDate',
  'updateTime',
  'weekNo',
  'year',
]

describe('shared weekly review runtime whitelist', () => {
  it('projects only the exact public top-level fields', () => {
    const result = normalizeSharedWeeklyReviewWire({
      id: 1,
      author: { id: 2, username: 'Alice', email: 'alice@example.com' } as never,
      year: 2026,
      weekNo: 36,
      startDate: '2026-08-31',
      endDate: '2026-09-06',
      focusProject: { id: 3, name: 'Project A', description: 'private detail' } as never,
      sharedSummary: 'A public summary',
      createTime: '2026-09-01T08:00:00',
      updateTime: '2026-09-01T09:00:00',
      reflection: 'private reflection',
      nextPlan: 'private plan',
      taskIds: [11, 12],
      completedTaskCount: 8,
      visibilityScope: 'TEAM',
      teamId: 7,
    } as never)

    expect(result).not.toBeNull()
    expect(Object.keys(result ?? {}).sort()).toEqual(TOP_LEVEL_WHITELIST)
    expect(result).not.toHaveProperty('reflection')
    expect(result).not.toHaveProperty('nextPlan')
    expect(result).not.toHaveProperty('taskIds')
    expect(result).not.toHaveProperty('completedTaskCount')
    expect(result).not.toHaveProperty('visibilityScope')
    expect(result).not.toHaveProperty('teamId')
  })

  it('projects only the exact public nested fields', () => {
    const result = normalizeSharedWeeklyReviewWire({
      id: 1,
      author: {
        id: 2,
        username: 'Alice',
        email: 'alice@example.com',
        role: 'ADMIN',
      } as never,
      focusProject: {
        id: 3,
        name: 'Project A',
        description: 'private detail',
        teamId: 7,
        taskIds: [11],
      } as never,
    } as never)

    expect(result?.author).toEqual({ id: '2', username: 'Alice' })
    expect(Object.keys(result?.author ?? {}).sort()).toEqual(['id', 'username'])
    expect(result?.focusProject).toEqual({ id: '3', name: 'Project A' })
    expect(Object.keys(result?.focusProject ?? {}).sort()).toEqual(['id', 'name'])
  })

  it('never probes forbidden private fields or nested project details', () => {
    const review = {
      id: 1,
      author: { id: 2, username: 'Alice' },
      focusProject: { id: 3, name: 'Project A' },
    } as Record<string, unknown>

    for (const field of ['reflection', 'nextPlan', 'taskIds', 'completedTaskCount', 'visibilityScope', 'teamId']) {
      Object.defineProperty(review, field, {
        configurable: true,
        get() {
          throw new Error(`forbidden field accessed: ${field}`)
        },
      })
    }

    const focusProject = review.focusProject as Record<string, unknown>
    for (const field of ['description', 'teamId', 'taskIds', 'content']) {
      Object.defineProperty(focusProject, field, {
        configurable: true,
        get() {
          throw new Error(`forbidden project field accessed: ${field}`)
        },
      })
    }

    expect(() => normalizeSharedWeeklyReviewWire(review as never)).not.toThrow()
  })

  it('creates an isolated projection without mutating the wire object', () => {
    const wire = {
      id: '900719925474099312345',
      author: { id: '900719925474099312346', username: 'Alice' },
      focusProject: { id: '900719925474099312347', name: 'Project A' },
      sharedSummary: 'Summary',
    }

    const result = normalizeSharedWeeklyReviewWire(wire)

    expect(result).not.toBe(wire)
    expect(result?.author).not.toBe(wire.author)
    expect(result?.focusProject).not.toBe(wire.focusProject)
    expect(result?.id).toBe('900719925474099312345')
    expect(wire).toEqual({
      id: '900719925474099312345',
      author: { id: '900719925474099312346', username: 'Alice' },
      focusProject: { id: '900719925474099312347', name: 'Project A' },
      sharedSummary: 'Summary',
    })
  })

  it('normalizes a page and drops records without a valid ID', () => {
    const result = normalizeSharedWeeklyReviewPage({
      records: [
        {
          id: 1,
          author: { id: 2, username: 'Alice' },
          sharedSummary: 'Visible',
          reflection: 'private',
        } as never,
        {
          author: { id: 3, username: 'Bob' },
          sharedSummary: 'Invalid record',
        },
      ],
      current: '2',
      size: '20',
      total: '21',
    })

    expect(result).toEqual({
      records: [expect.objectContaining({ id: '1', sharedSummary: 'Visible' })],
      current: 2,
      size: 20,
      total: 21,
    })
    expect(result.records[0]).not.toHaveProperty('reflection')
  })

  it('uses safe pagination defaults for a missing page', () => {
    expect(normalizeSharedWeeklyReviewPage(null)).toEqual({
      records: [],
      current: 1,
      size: 20,
      total: 0,
    })
  })
})
