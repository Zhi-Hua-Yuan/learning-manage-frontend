<template>
  <main class="flex-1 overflow-y-auto bg-[var(--color-bg-page)] p-4 sm:p-6 lg:p-8">
    <div class="mx-auto w-full max-w-6xl space-y-6">
      <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-black text-[var(--color-text-primary)]">团队管理</h1>
          <p class="mt-1 text-sm text-[var(--color-text-secondary)]">创建或加入团队，并按角色管理成员与团队设置。</p>
        </div>
        <div class="flex gap-2">
          <button type="button" class="btn-secondary" @click="openJoin">加入团队</button>
          <button type="button" class="btn-primary" @click="openCreate">创建团队</button>
        </div>
      </header>

      <div v-if="teamsLoadState.status === 'loading' && teams.length === 0" class="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div class="card-base h-72 animate-pulse rounded-2xl"></div>
        <div class="card-base h-96 animate-pulse rounded-2xl"></div>
      </div>

      <div v-else-if="teamsLoadState.status === 'error' && teams.length === 0" class="card-base rounded-2xl p-8 text-center">
        <h2 class="text-lg font-bold text-[var(--color-text-primary)]">团队信息加载失败</h2>
        <p class="mt-2 text-sm text-[var(--color-text-secondary)]">{{ teamsLoadState.errorMessage || '请检查网络后重试。' }}</p>
        <button type="button" class="btn-primary mt-5" @click="retryTeams">重新加载</button>
      </div>

      <div v-else-if="teams.length === 0" class="card-base rounded-2xl p-8 text-center sm:p-12">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary-soft-2)] text-2xl text-[var(--color-primary)]">◎</div>
        <h2 class="mt-5 text-xl font-bold text-[var(--color-text-primary)]">开始你的第一个团队</h2>
        <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--color-text-secondary)]">创建团队后分享邀请码，或使用他人提供的邀请码加入现有团队。</p>
        <div class="mt-6 flex justify-center gap-3">
          <button type="button" class="btn-secondary" @click="openJoin">使用邀请码加入</button>
          <button type="button" class="btn-primary" @click="openCreate">创建团队</button>
        </div>
      </div>

      <div v-else class="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside class="card-base rounded-2xl bg-[var(--color-bg-surface)] p-3">
          <label class="mb-2 block px-1 text-xs font-bold text-[var(--color-text-tertiary)] lg:hidden" for="mobile-team-select">当前团队</label>
          <select id="mobile-team-select" class="focus-ring w-full rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm lg:hidden" :value="selectedTeamId" @change="selectTeam(($event.target as HTMLSelectElement).value)">
            <option v-for="team in teams" :key="team.id" :value="team.id">{{ team.name }} · {{ roleLabel(team.role) }}</option>
          </select>
          <div class="hidden space-y-1 lg:block">
            <button v-for="team in teams" :key="team.id" type="button" class="interactive-row w-full rounded-xl px-3 py-3 text-left" :class="selectedTeamId === team.id ? 'is-active' : ''" @click="selectTeam(team.id)">
              <span class="block truncate text-sm font-bold text-[var(--color-text-primary)]">{{ team.name || `团队 ${team.id}` }}</span>
              <span class="mt-1 block text-xs text-[var(--color-text-tertiary)]">{{ roleLabel(team.role) }}</span>
            </button>
          </div>
        </aside>

        <section v-if="selectedTeam" class="space-y-4">
          <article class="card-base rounded-2xl bg-[var(--color-bg-surface)] p-5 sm:p-6">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="truncate text-xl font-black text-[var(--color-text-primary)]">{{ selectedTeam.name }}</h2>
                  <span class="rounded-full bg-[var(--color-primary-soft-2)] px-2.5 py-1 text-xs font-bold text-[var(--color-primary)]">{{ roleLabel(selectedTeam.role) }}</span>
                </div>
                <p class="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--color-text-secondary)]">{{ selectedTeam.description || '暂无团队描述。' }}</p>
              </div>
              <button v-if="canEditTeam" type="button" class="btn-secondary shrink-0" @click="openEdit">编辑资料</button>
            </div>
          </article>

          <article v-if="isOwner" class="card-base rounded-2xl bg-[var(--color-bg-surface)] p-5 sm:p-6">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 class="font-bold text-[var(--color-text-primary)]">团队邀请码</h3>
                <p class="mt-1 text-xs text-[var(--color-text-secondary)]">仅团队拥有者可以查看和重新生成，请通过可信渠道分享。</p>
              </div>
              <button v-if="!currentInvite" type="button" class="btn-secondary" :disabled="inviteLoading" @click="loadInvite">{{ inviteLoading ? '加载中…' : '查看邀请码' }}</button>
            </div>
            <div v-if="currentInvite" class="mt-4 flex flex-col gap-3 rounded-xl bg-[var(--color-bg-page)] p-4 sm:flex-row sm:items-center">
              <code class="flex-1 text-center text-xl font-black tracking-[0.25em] text-[var(--color-text-primary)] sm:text-left">{{ currentInvite }}</code>
              <div class="flex gap-2">
                <button type="button" class="btn-secondary flex-1" @click="copyInvite(currentInvite)">复制</button>
                <button type="button" class="btn-secondary flex-1 whitespace-nowrap" @click="showRegenerateConfirm = true">重新生成</button>
              </div>
            </div>
          </article>

          <article class="card-base rounded-2xl bg-[var(--color-bg-surface)] p-5 sm:p-6">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h3 class="font-bold text-[var(--color-text-primary)]">团队成员</h3>
                <p class="mt-1 text-xs text-[var(--color-text-secondary)]">{{ memberSummary }}</p>
              </div>
              <button type="button" class="text-sm font-medium text-[var(--color-primary)] hover:underline" @click="refreshMembers">{{ membersLoading ? '重新加载' : '刷新' }}</button>
            </div>

            <div v-if="membersLoading && members.length === 0" class="mt-5 space-y-3">
              <div v-for="index in 3" :key="index" class="h-14 animate-pulse rounded-xl bg-[var(--color-bg-page)]"></div>
            </div>
            <div v-else-if="memberLoadState?.status === 'error' && members.length === 0" class="mt-5 rounded-xl bg-[var(--color-danger-soft)] p-4 text-sm text-[var(--color-danger)]">
              成员加载失败。<button type="button" class="ml-2 underline" @click="loadMembers(true)">重试</button>
            </div>
            <div v-else class="mt-5 divide-y divide-[var(--color-divider-muted)]">
              <div v-for="member in members" :key="member.userId" class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                <div class="flex min-w-0 flex-1 items-center gap-3">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft-2)] font-bold text-[var(--color-primary)]">{{ (member.username || 'U').charAt(0).toUpperCase() }}</div>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-bold text-[var(--color-text-primary)]">{{ member.username || `用户 ${member.userId}` }}<span v-if="member.userId === currentUser?.id" class="ml-1 text-xs font-normal text-[var(--color-text-tertiary)]">（你）</span></p>
                    <p class="mt-1 text-xs text-[var(--color-text-tertiary)]">加入于 {{ formatDate(member.joinedAt) }}</p>
                  </div>
                </div>
                <div class="flex items-center justify-between gap-2 sm:justify-end">
                  <select v-if="canChangeRole(member)" class="focus-ring rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-2 py-2 text-sm" :value="member.role" :disabled="pendingMemberId === member.userId" @change="changeRole(member.userId, ($event.target as HTMLSelectElement).value as 'ADMIN' | 'MEMBER')">
                    <option value="ADMIN">管理员</option>
                    <option value="MEMBER">成员</option>
                  </select>
                  <span v-else class="rounded-lg bg-[var(--color-bg-page)] px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)]">{{ roleLabel(member.role) }}</span>
                  <button v-if="canRemove(member)" type="button" class="rounded-lg px-3 py-2 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]" :disabled="pendingMemberId === member.userId" @click="pendingRemoveMember = member">移除</button>
                </div>
              </div>
            </div>
          </article>

          <article class="card-base rounded-2xl bg-[var(--color-bg-surface)] p-5 sm:p-6">
            <h3 class="font-bold text-[var(--color-text-primary)]">成员操作</h3>
            <div v-if="!isOwner" class="mt-4 flex flex-col gap-3 rounded-xl border border-[var(--color-danger)]/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-sm font-bold text-[var(--color-text-primary)]">退出团队</p>
                <p class="mt-1 text-xs text-[var(--color-text-secondary)]">退出后将无法访问团队内容，名下未完成任务会被取消负责人。</p>
              </div>
              <button type="button" class="btn-danger shrink-0" @click="openLeaveConfirm">退出团队</button>
            </div>
            <div v-else class="mt-4 space-y-4">
              <div class="rounded-xl border border-[var(--color-input-border)] p-4">
                <p class="text-sm font-bold text-[var(--color-text-primary)]">转让所有权</p>
                <p class="mt-1 text-xs text-[var(--color-text-secondary)]">转让后你将成为管理员，新拥有者将获得全部团队权限。</p>
                <div class="mt-3 flex flex-col gap-2 sm:flex-row">
                  <select v-model="transferTargetId" class="focus-ring min-w-0 flex-1 rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm">
                    <option value="">请选择新拥有者</option>
                    <option v-for="member in transferCandidates" :key="member.userId" :value="member.userId">{{ member.username || `用户 ${member.userId}` }} · {{ roleLabel(member.role) }}</option>
                  </select>
                  <button type="button" class="btn-secondary" :disabled="!transferTargetId" @click="showTransferConfirm = true">确认转让</button>
                </div>
              </div>
              <div class="rounded-xl border border-[var(--color-danger)]/40 bg-[var(--color-danger-soft)] p-4">
                <p class="text-sm font-bold text-[var(--color-danger)]">解散团队</p>
                <p class="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">仅空团队可解散。存在有效项目或团队共享周报时必须先清理。</p>
                <button type="button" class="btn-danger mt-3" :disabled="dissolutionChecking" @click="openDissolve">{{ dissolutionChecking ? '检查中…' : '检查并解散' }}</button>
                <p v-if="dissolutionCheck && !dissolutionCheck.canDissolve" class="mt-3 text-xs text-[var(--color-danger)]">阻塞项：{{ dissolutionCheck.activeProjectCount }} 个有效项目、{{ dissolutionCheck.sharedReviewCount }} 条共享周报。</p>
              </div>
            </div>
          </article>
        </section>
      </div>
    </div>

    <div v-if="showCreateModal" class="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-[var(--color-bg-mask)] p-4" role="dialog" aria-modal="true" aria-label="创建团队" @click.self="closeCreate">
      <form class="surface-panel w-full max-w-lg rounded-2xl p-6" @submit.prevent="submitCreate">
        <h2 class="text-xl font-black text-[var(--color-text-primary)]">创建团队</h2>
        <label class="mt-5 block text-sm font-bold">团队名称</label>
        <input v-model="createForm.name" maxlength="60" autofocus class="focus-ring mt-2 w-full rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 py-3 text-sm" placeholder="例如：产品研发组" />
        <label class="mt-4 block text-sm font-bold">团队描述</label>
        <textarea v-model="createForm.description" maxlength="200" rows="4" class="focus-ring mt-2 w-full resize-none rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 py-3 text-sm" placeholder="简单说明团队目标（选填）"></textarea>
        <p class="mt-1 text-right text-xs text-[var(--color-text-tertiary)]">{{ createForm.description.length }}/200</p>
        <div class="mt-6 flex justify-end gap-3"><button type="button" class="btn-secondary" :disabled="submitting" @click="closeCreate">取消</button><button type="submit" class="btn-primary" :disabled="submitting">{{ submitting ? '创建中…' : '创建团队' }}</button></div>
      </form>
    </div>

    <div v-if="showJoinModal" class="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-[var(--color-bg-mask)] p-4" role="dialog" aria-modal="true" aria-label="加入团队" @click.self="closeJoin">
      <form class="surface-panel w-full max-w-md rounded-2xl p-6" @submit.prevent="submitJoin">
        <h2 class="text-xl font-black text-[var(--color-text-primary)]">加入团队</h2>
        <p class="mt-2 text-sm text-[var(--color-text-secondary)]">请输入团队拥有者提供的邀请码。</p>
        <input v-model="joinCode" maxlength="60" autofocus class="focus-ring mt-5 w-full rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 py-3 text-center font-mono text-lg uppercase tracking-[0.2em]" placeholder="邀请码" />
        <div class="mt-6 flex justify-end gap-3"><button type="button" class="btn-secondary" :disabled="submitting" @click="closeJoin">取消</button><button type="submit" class="btn-primary" :disabled="submitting">{{ submitting ? '加入中…' : '加入团队' }}</button></div>
      </form>
    </div>

    <div v-if="showEditModal && selectedTeam" class="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-[var(--color-bg-mask)] p-4" role="dialog" aria-modal="true" aria-label="编辑团队资料" @click.self="showEditModal = false">
      <form class="surface-panel w-full max-w-lg rounded-2xl p-6" @submit.prevent="submitEdit">
        <h2 class="text-xl font-black text-[var(--color-text-primary)]">编辑团队资料</h2>
        <label class="mt-5 block text-sm font-bold">团队名称</label><input v-model="editForm.name" maxlength="60" class="focus-ring mt-2 w-full rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 py-3 text-sm" />
        <label class="mt-4 block text-sm font-bold">团队描述</label><textarea v-model="editForm.description" maxlength="200" rows="4" class="focus-ring mt-2 w-full resize-none rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 py-3 text-sm"></textarea>
        <div class="mt-6 flex justify-end gap-3"><button type="button" class="btn-secondary" :disabled="submitting" @click="showEditModal = false">取消</button><button type="submit" class="btn-primary" :disabled="submitting">{{ submitting ? '保存中…' : '保存修改' }}</button></div>
      </form>
    </div>

    <div v-if="createdInvite" class="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-[var(--color-bg-mask)] p-4" role="dialog" aria-modal="true" aria-label="团队创建成功">
      <div class="surface-panel w-full max-w-md rounded-2xl p-6 text-center">
        <h2 class="text-xl font-black text-[var(--color-text-primary)]">团队创建成功</h2><p class="mt-2 text-sm text-[var(--color-text-secondary)]">请立即保存邀请码，之后也可在团队管理页由 OWNER 查看。</p>
        <code class="mt-5 block rounded-xl bg-[var(--color-bg-page)] px-4 py-4 text-2xl font-black tracking-[0.25em]">{{ createdInvite }}</code>
        <div class="mt-6 flex gap-3"><button type="button" class="btn-secondary flex-1" @click="copyInvite(createdInvite)">复制邀请码</button><button type="button" class="btn-primary flex-1" @click="createdInvite = ''">我已保存</button></div>
      </div>
    </div>

    <div v-if="showDissolveModal && selectedTeam" class="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-[var(--color-bg-mask)] p-4" role="dialog" aria-modal="true" aria-label="解散团队" @click.self="closeDissolve">
      <div class="surface-panel w-full max-w-md rounded-2xl p-6">
        <h2 class="text-xl font-black text-[var(--color-danger)]">确认解散团队</h2><p class="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">该操作会移除所有成员且不可恢复。请输入团队名称 <strong>{{ selectedTeam.name }}</strong> 以确认。</p>
        <input v-model="dissolveName" class="focus-ring mt-5 w-full rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-4 py-3 text-sm" />
        <div class="mt-6 flex justify-end gap-3"><button type="button" class="btn-secondary" :disabled="submitting" @click="closeDissolve">取消</button><button type="button" class="btn-danger" :disabled="submitting || dissolveName !== selectedTeam.name" @click="executeDissolve">{{ submitting ? '解散中…' : '永久解散' }}</button></div>
      </div>
    </div>

    <AppConfirmDialog v-model="showLeaveConfirm" title="确认退出团队？" message="退出后，你将无法再访问该团队。当前分配给你的未完成任务将保留在团队中，但负责人会被清空。" confirm-text="确认退出" variant="danger" :loading="submitting" @confirm="executeLeave" />
    <AppConfirmDialog :model-value="Boolean(pendingRemoveMember)" title="确认移除成员？" :message="`将移除“${pendingRemoveMember?.username || '该成员'}”，其未完成任务会被取消负责人。`" confirm-text="确认移除" variant="danger" :loading="submitting" @update:model-value="value => { if (!value) pendingRemoveMember = null }" @confirm="executeRemove" />
    <AppConfirmDialog v-model="showRegenerateConfirm" title="重新生成邀请码？" message="生成后旧邀请码立即失效，已加入的成员不受影响。" confirm-text="重新生成" :loading="submitting" @confirm="executeRegenerateInvite" />
    <AppConfirmDialog v-model="showTransferConfirm" title="确认转让所有权？" message="转让后你将降为管理员，此操作需要新拥有者再次转让才能撤销。" confirm-text="确认转让" variant="danger" :loading="submitting" @confirm="executeTransfer" />
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'

import AppConfirmDialog from '@/components/AppConfirmDialog.vue'
import { useToast } from '@/composables/useToast'
import { useCollaborationStore, type TeamDissolutionCheckContext } from '@/stores/collaboration'
import { normalizeEntityId } from '@/types/normalization'
import type { TeamMemberContext, TeamRole } from '@/types/team'
import {
  canChangeTeamMemberRole,
  canLoadTeamMembers,
  canRemoveTeamMember,
  getTeamMemberSummary,
  getTeamRoleLabel,
} from './teamManagement'

defineOptions({ name: 'TeamManagementView' })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const collaboration = useCollaborationStore()
const { currentUser, teams, teamsLoadState, teamMembersByTeamId } = storeToRefs(collaboration)

const showCreateModal = ref(false)
const showJoinModal = ref(false)
const showEditModal = ref(false)
const showLeaveConfirm = ref(false)
const showRegenerateConfirm = ref(false)
const showTransferConfirm = ref(false)
const showDissolveModal = ref(false)
const submitting = ref(false)
const inviteLoading = ref(false)
const dissolutionChecking = ref(false)
const createdInvite = ref('')
const joinCode = ref('')
const transferTargetId = ref('')
const dissolveName = ref('')
const pendingMemberId = ref('')
const pendingLeaveTeamId = ref('')
const pendingRemoveMember = ref<TeamMemberContext | null>(null)
const invites = reactive<Record<string, string>>({})
const dissolutionCheck = ref<TeamDissolutionCheckContext | null>(null)
const createForm = reactive({ name: '', description: '' })
const editForm = reactive({ name: '', description: '' })

const selectedTeamId = computed(() => normalizeEntityId(route.query.teamId) ?? '')
const selectedTeam = computed(() => collaboration.getTeam(selectedTeamId.value))
const memberBucket = computed(() => selectedTeamId.value ? teamMembersByTeamId.value[selectedTeamId.value] : undefined)
const members = computed(() => memberBucket.value?.records ?? [])
const memberLoadState = computed(() => memberBucket.value?.loadState)
const membersLoading = computed(() => memberLoadState.value?.status === 'loading')
const memberSummary = computed(() => getTeamMemberSummary(memberLoadState.value?.status, members.value.length))
const isOwner = computed(() => selectedTeam.value?.role === 'OWNER')
const canEditTeam = computed(() => selectedTeam.value?.role === 'OWNER' || selectedTeam.value?.role === 'ADMIN')
const currentInvite = computed(() => selectedTeamId.value ? invites[selectedTeamId.value] ?? '' : '')
const transferCandidates = computed(() => members.value.filter(member => member.userId !== currentUser.value?.id && member.role !== 'OWNER'))

const roleLabel = (role: TeamRole) => getTeamRoleLabel(role)
const errorMessage = (error: unknown, fallback: string) => error instanceof Error && error.message ? error.message : fallback
const formatDate = (value: string | null) => {
  if (!value) return '未知日期'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '未知日期'
    : new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(date)
}

const replaceTeamQuery = async (teamId: string) => {
  await router.replace({ path: '/teams', query: teamId ? { teamId } : {} })
}
const selectTeam = (teamId: string) => void replaceTeamQuery(teamId)

const syncSelection = () => {
  if (teamsLoadState.value.status !== 'ready') return
  if (teams.value.length === 0) {
    if (selectedTeamId.value) void replaceTeamQuery('')
    return
  }
  if (!teams.value.some(team => team.id === selectedTeamId.value)) void replaceTeamQuery(teams.value[0]!.id)
}

const loadMembers = async (force = false) => {
  if (!canLoadTeamMembers({
    currentUserId: currentUser.value?.id ?? '',
    teamsStatus: teamsLoadState.value.status,
    selectedTeamId: selectedTeamId.value,
    availableTeamId: selectedTeam.value?.id ?? '',
  })) return
  try { await collaboration.ensureTeamMembers(selectedTeamId.value, { force }) }
  catch (error) { toast.error(errorMessage(error, '成员加载失败，请稍后重试。')) }
}

const refreshMembers = () => void loadMembers(true)

const retryTeams = async () => {
  try { await collaboration.refreshMyTeams({ force: true }) }
  catch (error) { toast.error(errorMessage(error, '团队加载失败，请稍后重试。')) }
}

const openCreate = () => { createForm.name = ''; createForm.description = ''; showCreateModal.value = true }
const closeCreate = () => { if (!submitting.value) showCreateModal.value = false }
const openJoin = () => { joinCode.value = ''; showJoinModal.value = true }
const closeJoin = () => { if (!submitting.value) showJoinModal.value = false }
const openLeaveConfirm = () => {
  if (!selectedTeamId.value) return
  pendingLeaveTeamId.value = selectedTeamId.value
  showLeaveConfirm.value = true
}
const openEdit = () => {
  if (!selectedTeam.value) return
  editForm.name = selectedTeam.value.name
  editForm.description = selectedTeam.value.description
  showEditModal.value = true
}

const submitCreate = async () => {
  const name = createForm.name.trim()
  if (!name) return toast.error('团队名称不能为空。')
  submitting.value = true
  try {
    const result = await collaboration.createTeam({ name, description: createForm.description.trim() })
    showCreateModal.value = false
    createdInvite.value = result.inviteCode
    invites[result.teamId] = result.inviteCode
    if (result.teamListRefreshed) {
      try {
        await replaceTeamQuery(result.teamId)
      } catch {
        toast.warning('团队已创建，但页面未能切换到新团队。邀请码已保留。')
        return
      }
      toast.success('团队创建成功。')
    } else {
      toast.warning('团队已创建，但团队列表同步失败。邀请码已保留，请稍后重新加载列表。')
    }
  } catch (error) { toast.error(errorMessage(error, '创建团队失败，请稍后重试。')) }
  finally { submitting.value = false }
}

const submitJoin = async () => {
  const code = joinCode.value.trim().toUpperCase()
  if (!code) return toast.error('邀请码不能为空。')
  submitting.value = true
  try {
    const joinedTeamId = await collaboration.joinTeam(code)
    showJoinModal.value = false
    if (joinedTeamId) await replaceTeamQuery(joinedTeamId)
    toast.success('已加入团队。')
  } catch (error) { toast.error(errorMessage(error, '加入团队失败，请检查邀请码。')) }
  finally { submitting.value = false }
}

const submitEdit = async () => {
  if (!selectedTeam.value) return
  const name = editForm.name.trim()
  if (!name) return toast.error('团队名称不能为空。')
  submitting.value = true
  try {
    await collaboration.updateTeam({ teamId: selectedTeam.value.id, name, description: editForm.description.trim() })
    showEditModal.value = false
    toast.success('团队资料已更新。')
  } catch (error) { toast.error(errorMessage(error, '团队资料更新失败。')); await retryTeams() }
  finally { submitting.value = false }
}

const loadInvite = async () => {
  if (!selectedTeamId.value) return
  inviteLoading.value = true
  try { const result = await collaboration.loadTeamInvite(selectedTeamId.value); invites[result.teamId] = result.inviteCode }
  catch (error) { toast.error(errorMessage(error, '邀请码加载失败。')); await retryTeams() }
  finally { inviteLoading.value = false }
}

const copyInvite = async (code: string) => {
  try { await navigator.clipboard.writeText(code); toast.success('邀请码已复制。') }
  catch { toast.error('复制失败，请手动选择邀请码。') }
}

const executeRegenerateInvite = async () => {
  if (!selectedTeamId.value) return
  submitting.value = true
  try { const result = await collaboration.regenerateTeamInvite(selectedTeamId.value); invites[result.teamId] = result.inviteCode; showRegenerateConfirm.value = false; toast.success('邀请码已重新生成。') }
  catch (error) { toast.error(errorMessage(error, '邀请码生成失败。')); await retryTeams() }
  finally { submitting.value = false }
}

const canChangeRole = (member: TeamMemberContext) => canChangeTeamMemberRole(
  selectedTeam.value?.role ?? 'UNKNOWN', currentUser.value?.id ?? '', member,
)
const canRemove = (member: TeamMemberContext) => canRemoveTeamMember(
  selectedTeam.value?.role ?? 'UNKNOWN', currentUser.value?.id ?? '', member,
)

const changeRole = async (userId: string, role: 'ADMIN' | 'MEMBER') => {
  if (!selectedTeamId.value) return
  pendingMemberId.value = userId
  try { await collaboration.changeTeamMemberRole(selectedTeamId.value, userId, role); toast.success('成员角色已更新。') }
  catch (error) { toast.error(errorMessage(error, '角色更新失败。')); await loadMembers(true) }
  finally { pendingMemberId.value = '' }
}

const executeRemove = async () => {
  if (!selectedTeamId.value || !pendingRemoveMember.value) return
  submitting.value = true
  try {
    const result = await collaboration.removeTeamMember(selectedTeamId.value, pendingRemoveMember.value.userId)
    pendingRemoveMember.value = null
    toast.success(result.unassignedTaskCount > 0 ? `成员已移除，${result.unassignedTaskCount} 项任务已取消负责人。` : '成员已移除。')
  } catch (error) { toast.error(errorMessage(error, '移除成员失败。')); await loadMembers(true) }
  finally { submitting.value = false }
}

const executeLeave = async () => {
  const leavingTeamId = pendingLeaveTeamId.value
  if (!leavingTeamId) return
  submitting.value = true
  try {
    const result = await collaboration.leaveTeam(leavingTeamId)
    showLeaveConfirm.value = false
    pendingLeaveTeamId.value = ''
    toast.success(result.unassignedTaskCount > 0 ? `已退出团队，${result.unassignedTaskCount} 项任务已取消负责人。` : '已退出团队。')
    if (!result.teamListRefreshed) {
      toast.warning('退出已生效，但团队列表同步失败，请稍后重新加载。')
    }
    if (selectedTeamId.value === leavingTeamId) {
      try {
        await replaceTeamQuery(teams.value[0]?.id ?? '')
      } catch {
        toast.warning('退出已生效，但页面未能切换团队，请重新进入团队管理页。')
      }
    }
  } catch (error) { toast.error(errorMessage(error, '退出团队失败。')); await retryTeams() }
  finally { submitting.value = false }
}

const executeTransfer = async () => {
  if (!selectedTeamId.value || !transferTargetId.value) return
  submitting.value = true
  try { await collaboration.transferTeamOwnership(selectedTeamId.value, transferTargetId.value); showTransferConfirm.value = false; transferTargetId.value = ''; toast.success('团队所有权已转让。') }
  catch (error) { toast.error(errorMessage(error, '所有权转让失败。')); await Promise.all([retryTeams(), loadMembers(true)]) }
  finally { submitting.value = false }
}

const openDissolve = async () => {
  if (!selectedTeamId.value) return
  dissolutionChecking.value = true
  try {
    dissolutionCheck.value = await collaboration.checkTeamDissolution(selectedTeamId.value)
    if (dissolutionCheck.value.canDissolve) { dissolveName.value = ''; showDissolveModal.value = true }
    else toast.warning('团队仍有关联业务数据，暂不能解散。')
  } catch (error) { toast.error(errorMessage(error, '解散条件检查失败。')); await retryTeams() }
  finally { dissolutionChecking.value = false }
}
const closeDissolve = () => { if (!submitting.value) { showDissolveModal.value = false; dissolveName.value = '' } }
const executeDissolve = async () => {
  if (!selectedTeam.value || dissolveName.value !== selectedTeam.value.name) return
  submitting.value = true
  try { await collaboration.dissolveTeam(selectedTeam.value.id); showDissolveModal.value = false; dissolveName.value = ''; toast.success('团队已解散。'); syncSelection() }
  catch (error) { toast.error(errorMessage(error, '解散团队失败。')); await retryTeams() }
  finally { submitting.value = false }
}

watch(
  [() => teamsLoadState.value.status, () => teams.value.map(team => team.id).join(','), selectedTeamId],
  syncSelection,
  { immediate: true },
)
watch(showLeaveConfirm, (visible) => {
  if (!visible && !submitting.value) pendingLeaveTeamId.value = ''
})
watch(
  [
    () => currentUser.value?.id ?? '',
    () => teamsLoadState.value.status,
    selectedTeamId,
    () => selectedTeam.value?.id ?? '',
  ],
  () => {
    dissolutionCheck.value = null
    transferTargetId.value = ''
    void loadMembers()
  },
  { immediate: true },
)
watch(() => route.query.action, (action) => {
  if (action === 'create') openCreate()
  if (action === 'join') openJoin()
  if (action === 'create' || action === 'join') void router.replace({ path: '/teams', query: selectedTeamId.value ? { teamId: selectedTeamId.value } : {} })
}, { immediate: true })

onMounted(async () => {
  try { await collaboration.bootstrapCollaborationContext() }
  catch (error) { toast.error(errorMessage(error, '团队上下文加载失败。')) }
})
</script>
