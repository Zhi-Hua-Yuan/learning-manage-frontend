import request from '../utils/request'
import type { EntityId } from '@/types/common'
import type { TeamMemberWire, TeamWire } from '@/types/team'
import { requireEntityId } from './guards'

export const fetchMyTeamsApi = () => {
  return request.get<unknown, Promise<TeamWire[]>>('/team/my')
}

export const fetchTeamMembersApi = (rawTeamId: EntityId) => {
  const teamId = requireEntityId(rawTeamId, 'teamId')
  return request.get<unknown, Promise<TeamMemberWire[]>>(
    `/team/${encodeURIComponent(teamId)}/members`,
  )
}
