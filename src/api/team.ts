import request from '../utils/request'
import type { EntityId } from '@/types/common'
import type {
  TeamCreateResultWire,
  TeamDissolutionCheckWire,
  TeamDissolutionWire,
  TeamInviteWire,
  TeamMemberWire,
  TeamMembershipTerminationWire,
  TeamOwnershipTransferWire,
  TeamRole,
  TeamWire,
} from '@/types/team'
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

export interface TeamCreatePayload {
  name: string
  description?: string
}

export interface TeamUpdatePayload extends TeamCreatePayload {
  teamId: EntityId
}

export const createTeamApi = (payload: TeamCreatePayload) => request.post<
  unknown,
  Promise<TeamCreateResultWire>
>('/team/create', {
  name: payload.name,
  description: payload.description ?? '',
})

export const joinTeamApi = (inviteCode: string) => request.post<unknown, Promise<boolean>>('/team/join', {
  inviteCode,
})

export const updateTeamApi = (payload: TeamUpdatePayload) => request.post<unknown, Promise<TeamWire>>(
  '/team/update',
  {
    teamId: requireEntityId(payload.teamId, 'teamId'),
    name: payload.name,
    description: payload.description ?? '',
  },
)

export const fetchTeamInviteApi = (rawTeamId: EntityId) => {
  const teamId = requireEntityId(rawTeamId, 'teamId')
  return request.get<unknown, Promise<TeamInviteWire>>(`/team/${encodeURIComponent(teamId)}/invite`)
}

export const regenerateTeamInviteApi = (rawTeamId: EntityId) => {
  const teamId = requireEntityId(rawTeamId, 'teamId')
  return request.post<unknown, Promise<TeamInviteWire>>(
    `/team/${encodeURIComponent(teamId)}/invite/regenerate`,
  )
}

export const updateTeamMemberRoleApi = (
  teamIdValue: EntityId,
  targetUserIdValue: EntityId,
  role: Extract<TeamRole, 'ADMIN' | 'MEMBER'>,
) => request.post<unknown, Promise<boolean>>('/team/member/role/update', {
  teamId: requireEntityId(teamIdValue, 'teamId'),
  targetUserId: requireEntityId(targetUserIdValue, 'targetUserId'),
  role,
})

export const leaveTeamApi = (rawTeamId: EntityId) => {
  const teamId = requireEntityId(rawTeamId, 'teamId')
  return request.post<unknown, Promise<TeamMembershipTerminationWire>>(
    `/team/${encodeURIComponent(teamId)}/leave`,
  )
}

export const removeTeamMemberApi = (teamIdValue: EntityId, targetUserIdValue: EntityId) => (
  request.post<unknown, Promise<TeamMembershipTerminationWire>>('/team/member/remove', {
    teamId: requireEntityId(teamIdValue, 'teamId'),
    targetUserId: requireEntityId(targetUserIdValue, 'targetUserId'),
  })
)

export const transferTeamOwnershipApi = (teamIdValue: EntityId, targetUserIdValue: EntityId) => (
  request.post<unknown, Promise<TeamOwnershipTransferWire>>('/team/owner/transfer', {
    teamId: requireEntityId(teamIdValue, 'teamId'),
    targetUserId: requireEntityId(targetUserIdValue, 'targetUserId'),
  })
)

export const fetchTeamDissolutionCheckApi = (rawTeamId: EntityId) => {
  const teamId = requireEntityId(rawTeamId, 'teamId')
  return request.get<unknown, Promise<TeamDissolutionCheckWire>>(
    `/team/${encodeURIComponent(teamId)}/dissolution-check`,
  )
}

export const dissolveTeamApi = (rawTeamId: EntityId) => {
  const teamId = requireEntityId(rawTeamId, 'teamId')
  return request.post<unknown, Promise<TeamDissolutionWire>>(
    `/team/${encodeURIComponent(teamId)}/dissolve`,
  )
}
