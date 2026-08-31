<template>
  <section class="mt-5" aria-labelledby="team-navigation-heading">
    <div class="flex items-center justify-between px-3 pb-2">
      <span id="team-navigation-heading" class="text-xs font-medium text-[var(--color-text-tertiary)]">
        团队
      </span>
      <button
        v-if="teamsLoadState.status === 'error'"
        type="button"
        class="text-xs text-[var(--color-primary)] hover:underline"
        @click="emit('retry-teams')"
      >
        重试
      </button>
    </div>

    <div
      v-if="teamsLoadState.status === 'loading' && teams.length === 0"
      class="space-y-2 px-3 py-2"
      aria-live="polite"
      aria-label="正在加载团队"
    >
      <div class="h-8 animate-pulse rounded-lg bg-[var(--color-menu-hover)]"></div>
      <div class="h-8 animate-pulse rounded-lg bg-[var(--color-menu-hover)]"></div>
    </div>

    <p
      v-else-if="teamsLoadState.status === 'error' && teams.length === 0"
      class="px-3 py-2 text-xs leading-5 text-[var(--color-danger)]"
      role="status"
    >
      团队加载失败，请重试。
    </p>

    <p
      v-else-if="teamsLoadState.status === 'ready' && teams.length === 0"
      class="px-3 py-2 text-xs leading-5 text-[var(--color-text-tertiary)]"
    >
      暂无团队
    </p>

    <div v-else class="space-y-1">
      <div v-for="team in teams" :key="team.id">
        <button
          type="button"
          class="interactive-row flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[var(--color-text-secondary)]"
          :aria-expanded="isExpanded(team.id)"
          :aria-controls="`team-projects-${team.id}`"
          @click="emit('toggle-team', team.id)"
        >
          <svg
            class="h-3.5 w-3.5 shrink-0 transition-transform"
            :class="isExpanded(team.id) ? 'rotate-90' : ''"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
          <span class="min-w-0 flex-1 truncate text-[13px] font-medium leading-5">
            {{ team.name || `团队 ${team.id}` }}
          </span>
          <span class="shrink-0 text-[10px] text-[var(--color-text-tertiary)]">
            {{ getTeamRoleLabel(team.role) }}
          </span>
        </button>

        <div
          v-if="isExpanded(team.id)"
          :id="`team-projects-${team.id}`"
          class="ml-4 border-l border-[var(--color-sidebar-border)] pl-2"
        >
          <div
            v-if="projectBucket(team.id)?.loadState.status === 'loading' && projectRecords(team.id).length === 0"
            class="space-y-2 px-3 py-2"
            aria-live="polite"
          >
            <div class="h-7 animate-pulse rounded-lg bg-[var(--color-menu-hover)]"></div>
            <div class="h-7 animate-pulse rounded-lg bg-[var(--color-menu-hover)]"></div>
          </div>

          <div
            v-else-if="projectBucket(team.id)?.loadState.status === 'error' && projectRecords(team.id).length === 0"
            class="px-3 py-2 text-xs text-[var(--color-danger)]"
          >
            <span>项目加载失败</span>
            <button type="button" class="ml-2 text-[var(--color-primary)] hover:underline" @click="emit('retry-projects', team.id)">
              重试
            </button>
          </div>

          <p
            v-else-if="projectBucket(team.id)?.loadState.status === 'ready' && projectRecords(team.id).length === 0"
            class="px-3 py-2 text-xs text-[var(--color-text-tertiary)]"
          >
            暂无团队项目
          </p>

          <button
            v-for="project in projectRecords(team.id)"
            :key="project.id"
            type="button"
            class="interactive-row flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left"
            :class="isSelected(team.id, project.id) ? 'is-active font-medium' : 'text-[var(--color-text-secondary)]'"
            :aria-current="isSelected(team.id, project.id) ? 'page' : undefined"
            @click="emit('select-project', { teamId: team.id, projectId: project.id })"
          >
            <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7h5l2 2h11v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
            <span class="min-w-0 flex-1 truncate text-[13px] leading-5">{{ project.name }}</span>
            <span
              v-if="project.color"
              class="h-2.5 w-2.5 shrink-0 rounded-full border border-white/70"
              :style="{ backgroundColor: project.color }"
            ></span>
          </button>

          <button
            v-if="projectBucket(team.id)?.hasMore"
            type="button"
            class="w-full px-3 py-2 text-left text-xs text-[var(--color-primary)] hover:underline disabled:cursor-wait disabled:opacity-60"
            :disabled="projectBucket(team.id)?.loadState.status === 'loading'"
            @click="emit('load-more-projects', team.id)"
          >
            {{ projectBucket(team.id)?.loadState.status === 'loading' ? '加载中…' : '加载更多' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { CollaborationLoadState, TeamProjectBucket } from '@/stores/collaboration'
import type { TeamContext } from '@/types/team'
import { getTeamRoleLabel } from './teamNavigation'

const props = defineProps<{
  teams: TeamContext[]
  teamsLoadState: CollaborationLoadState
  projectBuckets: Record<string, TeamProjectBucket>
  expandedTeamIds: string[]
  selectedTeamId: string
  selectedProjectId: string
}>()

const emit = defineEmits<{
  'toggle-team': [teamId: string]
  'retry-teams': []
  'retry-projects': [teamId: string]
  'load-more-projects': [teamId: string]
  'select-project': [selection: { teamId: string; projectId: string }]
}>()

const isExpanded = (teamId: string) => props.expandedTeamIds.includes(teamId)
const projectBucket = (teamId: string) => props.projectBuckets[teamId]
const projectRecords = (teamId: string) => projectBucket(teamId)?.records ?? []
const isSelected = (teamId: string, projectId: string) => (
  props.selectedTeamId === teamId && props.selectedProjectId === projectId
)
</script>
