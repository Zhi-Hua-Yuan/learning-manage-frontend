import type { TeamRole } from '@/types/team'

const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  OWNER: '所有者',
  ADMIN: '管理员',
  MEMBER: '成员',
  UNKNOWN: '只读',
}

export const getTeamRoleLabel = (role: TeamRole) => TEAM_ROLE_LABELS[role]

export const toggleExpandedTeamId = (
  expandedTeamIds: readonly string[],
  teamId: string,
) => expandedTeamIds.includes(teamId)
  ? expandedTeamIds.filter((candidate) => candidate !== teamId)
  : [...expandedTeamIds, teamId]
