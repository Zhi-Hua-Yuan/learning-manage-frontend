import { describe, expect, it } from 'vitest'

import {
  buildPersonalProjectRoute,
  buildTeamProjectRoute,
  parseTaskProjectContext,
  resolvePersonalProjectFallback,
} from './taskProjectContext'

describe('task project route context', () => {
  it('parses personal, team and aggregate contexts', () => {
    expect(parseTaskProjectContext({ projectId: '11' })).toEqual({
      type: 'personal-project',
      projectId: '11',
    })
    expect(parseTaskProjectContext({ teamId: '7', projectId: '12' })).toEqual({
      type: 'team-project',
      teamId: '7',
      projectId: '12',
    })
    expect(parseTaskProjectContext({ view: 'today', teamId: '7', projectId: '12' })).toEqual({
      type: 'aggregate',
      view: 'today',
    })
  })

  it('rejects incomplete and malformed project contexts', () => {
    expect(parseTaskProjectContext({ teamId: '7' })).toEqual({
      type: 'invalid',
      reason: 'missing-project-id',
    })
    expect(parseTaskProjectContext({ teamId: '0', projectId: '12' })).toEqual({
      type: 'invalid',
      reason: 'invalid-team-id',
    })
    expect(parseTaskProjectContext({ projectId: 'project-12' })).toEqual({
      type: 'invalid',
      reason: 'invalid-project-id',
    })
  })

  it('builds routes without carrying collaboration context into personal views', () => {
    expect(buildPersonalProjectRoute('11')).toEqual({ path: '/tasks', query: { projectId: '11' } })
    expect(buildTeamProjectRoute('7', '12')).toEqual({
      path: '/tasks',
      query: { teamId: '7', projectId: '12' },
    })
  })

  it('uses only a still-accessible cached personal project as fallback', () => {
    const projects = [{ id: '11' }, { id: '12' }]
    expect(resolvePersonalProjectFallback(projects, '12')).toBe('12')
    expect(resolvePersonalProjectFallback(projects, '99')).toBe('11')
    expect(resolvePersonalProjectFallback([], '12')).toBeNull()
  })
})
