import type { LocationQueryRaw } from 'vue-router'

import { normalizeEntityId } from '@/types/normalization'

export type AggregateTaskView = 'today' | 'week'

export type TaskProjectContext =
  | { type: 'aggregate'; view: AggregateTaskView }
  | { type: 'personal-project'; projectId: string }
  | { type: 'team-project'; teamId: string; projectId: string }
  | { type: 'empty' }
  | { type: 'invalid'; reason: 'invalid-project-id' | 'invalid-team-id' | 'missing-project-id' }

type TaskRouteQuery = Record<string, unknown>

const getSingleValue = (value: unknown) => Array.isArray(value) ? value[0] : value

const getStringValue = (value: unknown) => {
  const candidate = getSingleValue(value)
  return typeof candidate === 'string' ? candidate.trim() : ''
}

export const parseTaskProjectContext = (query: TaskRouteQuery): TaskProjectContext => {
  const view = getStringValue(query.view)
  if (view === 'today' || view === 'week') {
    return { type: 'aggregate', view }
  }

  const rawTeamId = getStringValue(query.teamId)
  const rawProjectId = getStringValue(query.projectId)
  const hasTeamId = rawTeamId.length > 0
  const hasProjectId = rawProjectId.length > 0

  if (hasTeamId && !hasProjectId) {
    return { type: 'invalid', reason: 'missing-project-id' }
  }

  if (hasTeamId) {
    const teamId = normalizeEntityId(rawTeamId)
    if (!teamId) return { type: 'invalid', reason: 'invalid-team-id' }
    const projectId = normalizeEntityId(rawProjectId)
    if (!projectId) return { type: 'invalid', reason: 'invalid-project-id' }
    return { type: 'team-project', teamId, projectId }
  }

  if (hasProjectId) {
    const projectId = normalizeEntityId(rawProjectId)
    return projectId
      ? { type: 'personal-project', projectId }
      : { type: 'invalid', reason: 'invalid-project-id' }
  }

  return { type: 'empty' }
}

export const buildPersonalProjectRoute = (projectId: string) => ({
  path: '/tasks',
  query: { projectId: normalizeEntityId(projectId) ?? undefined } satisfies LocationQueryRaw,
})

export const buildTeamProjectRoute = (teamId: string, projectId: string) => ({
  path: '/tasks',
  query: {
    teamId: normalizeEntityId(teamId) ?? undefined,
    projectId: normalizeEntityId(projectId) ?? undefined,
  } satisfies LocationQueryRaw,
})

export const resolvePersonalProjectFallback = <T extends { id: string }>(
  projects: readonly T[],
  cachedProjectId: unknown,
) => {
  const cachedId = normalizeEntityId(cachedProjectId)
  if (cachedId && projects.some((project) => project.id === cachedId)) return cachedId
  return projects[0]?.id ?? null
}
