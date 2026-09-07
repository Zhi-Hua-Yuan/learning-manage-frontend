import type { TeamMemberContext, TeamRole } from '@/types/team'
import type { CollaborationLoadStatus } from '@/stores/collaboration'

export const getTeamRoleLabel = (role: TeamRole) => ({
  OWNER: '拥有者',
  ADMIN: '管理员',
  MEMBER: '成员',
  UNKNOWN: '未知角色',
})[role]

export const canChangeTeamMemberRole = (
  actorRole: TeamRole,
  actorUserId: string,
  member: TeamMemberContext,
) => actorRole === 'OWNER' && member.role !== 'OWNER' && member.userId !== actorUserId

export const canRemoveTeamMember = (
  actorRole: TeamRole,
  actorUserId: string,
  member: TeamMemberContext,
) => {
  if (member.userId === actorUserId || member.role === 'OWNER') return false
  if (actorRole === 'OWNER') return member.role === 'ADMIN' || member.role === 'MEMBER'
  return actorRole === 'ADMIN' && member.role === 'MEMBER'
}

export const canLoadTeamMembers = (context: {
  currentUserId: string
  teamsStatus: CollaborationLoadStatus
  selectedTeamId: string
  availableTeamId: string
}) => Boolean(
  context.currentUserId
  && context.teamsStatus === 'ready'
  && context.selectedTeamId
  && context.availableTeamId === context.selectedTeamId,
)

export const getTeamMemberSummary = (status: CollaborationLoadStatus | undefined, count: number) => {
  if (status === 'loading') return '正在加载成员…'
  if (status === 'error') return '成员加载失败'
  if (status === 'ready') return `${count} 名有效成员`
  return '等待加载成员'
}
