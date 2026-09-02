<template>
  <section
    class="card-base space-y-5 rounded-2xl bg-[var(--color-bg-surface)] p-5 sm:p-6"
    aria-labelledby="team-shared-review-heading"
    data-testid="team-shared-review-feed"
  >
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2
          id="team-shared-review-heading"
          class="flex items-center gap-2 text-lg font-bold text-[var(--color-text-primary)]"
        >
          <AppIcon name="document" class="h-5 w-5" aria-hidden="true" />
          团队动态
        </h2>
        <p class="mt-1 text-sm text-[var(--color-text-secondary)]">
          这里只展示团队成员主动共享的摘要。
        </p>
      </div>

      <button
        v-if="selectedTeamId && records.length > 0"
        type="button"
        class="btn-secondary rounded-lg px-3 py-2 text-xs font-bold"
        :disabled="busy"
        :aria-busy="busy ? 'true' : 'false'"
        data-testid="team-shared-review-refresh"
        @click="emit('refresh')"
      >
        {{ busy ? '刷新中…' : '刷新' }}
      </button>
    </header>

    <div class="space-y-2">
      <label
        for="team-shared-review-team-select"
        class="block text-sm font-bold text-[var(--color-text-body)]"
      >
        查看团队
      </label>
      <select
        id="team-shared-review-team-select"
        :value="selectedTeamId ?? ''"
        class="focus-ring w-full rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-body)]"
        :disabled="teamsLoading || Boolean(teamsError) || teams.length === 0"
        data-testid="team-shared-review-team-select"
        @change="onTeamChange"
      >
        <option value="">请选择团队</option>
        <option v-for="team in teams" :key="team.id" :value="team.id">
          {{ team.name }}
        </option>
      </select>

      <p v-if="teamsLoading" class="text-xs text-[var(--color-text-secondary)]" role="status">
        正在加载可访问团队…
      </p>
      <div v-else-if="teamsError" class="flex flex-wrap items-center gap-2" role="alert">
        <p class="text-sm text-[var(--color-danger)]">{{ teamsError }}</p>
        <button
          type="button"
          class="btn-secondary rounded-lg px-3 py-1.5 text-xs font-bold"
          data-testid="team-shared-review-retry-teams"
          @click="emit('retry-teams')"
        >
          重新加载团队
        </button>
      </div>
      <p
        v-else-if="teams.length === 0"
        class="text-sm text-[var(--color-text-secondary)]"
        role="status"
        data-testid="team-shared-review-no-teams"
      >
        当前没有可访问的团队。
      </p>
    </div>

    <div aria-live="polite">
      <div
        v-if="terminalError"
        class="rounded-xl border border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)] px-4 py-4"
        role="alert"
        :data-testid="`${phase}-state`"
      >
        <p class="text-sm font-semibold text-[var(--color-danger)]">
          {{ terminalErrorTitle }}
        </p>
        <p v-if="errorMessage" class="mt-1 text-xs text-[var(--color-danger)]">
          {{ errorMessage }}
        </p>
        <button
          v-if="phase !== 'authentication-required'"
          type="button"
          class="btn-secondary mt-3 rounded-lg px-3 py-1.5 text-xs font-bold"
          data-testid="team-shared-review-terminal-retry"
          @click="emit('retry')"
        >
          重新加载
        </button>
      </div>

      <div
        v-else-if="!selectedTeamId"
        class="flex min-h-40 items-center justify-center rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface-muted)] px-5 text-center"
        data-testid="team-shared-review-select-team"
        role="status"
      >
        <p class="text-sm text-[var(--color-text-secondary)]">请选择团队查看共享摘要。</p>
      </div>

      <div
        v-else-if="phase === 'loading' && records.length === 0"
        class="space-y-3"
        data-testid="team-shared-review-loading"
        role="status"
      >
        <div
          v-for="index in 3"
          :key="index"
          class="animate-pulse rounded-2xl bg-[var(--color-bg-surface-muted)] p-5"
        >
          <div class="h-4 w-32 rounded bg-[var(--color-border-default)]"></div>
          <div class="mt-3 h-3 w-48 rounded bg-[var(--color-border-default)]"></div>
          <div class="mt-2 h-3 w-full rounded bg-[var(--color-border-default)]"></div>
        </div>
      </div>

      <div
        v-else-if="phase === 'error' && records.length === 0"
        class="flex min-h-40 flex-col items-center justify-center rounded-xl border border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)] px-5 text-center"
        data-testid="team-shared-review-error"
        role="alert"
      >
        <p class="text-sm font-semibold text-[var(--color-danger)]">
          {{ errorMessage || '团队动态暂时无法加载。' }}
        </p>
        <button
          type="button"
          class="btn-secondary mt-3 rounded-lg px-3 py-1.5 text-xs font-bold"
          data-testid="team-shared-review-retry"
          @click="emit('retry')"
        >
          重新加载
        </button>
      </div>

      <div
        v-else-if="records.length === 0"
        class="flex min-h-40 items-center justify-center rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface-muted)] px-5 text-center"
        data-testid="team-shared-review-empty"
        role="status"
      >
        <p class="text-sm text-[var(--color-text-secondary)]">该团队暂无共享复盘。</p>
      </div>

      <template v-else>
        <div
          v-if="phase === 'refreshing'"
          class="mb-3 rounded-xl bg-[var(--color-bg-surface-muted)] px-3 py-2 text-xs text-[var(--color-text-secondary)]"
          data-testid="team-shared-review-refreshing"
          role="status"
        >
          正在刷新团队动态…
        </div>

        <div
          v-if="phase === 'refresh-error'"
          class="mb-3 rounded-xl border border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)] px-3 py-3"
          data-testid="team-shared-review-refresh-error"
          role="alert"
        >
          <p class="text-xs text-[var(--color-danger)]">
            {{ errorMessage || '团队动态刷新失败。' }}
          </p>
          <button
            type="button"
            class="btn-secondary mt-2 rounded-lg px-3 py-1.5 text-xs font-bold"
            data-testid="team-shared-review-refresh-retry"
            @click="emit('retry')"
          >
            重试刷新
          </button>
        </div>

        <ol class="space-y-3" data-testid="team-shared-review-list">
          <li v-for="review in records" :key="review.id">
            <SharedWeeklyReviewCard :review="review" />
          </li>
        </ol>

        <div
          v-if="phase === 'load-more-error'"
          class="mt-3 rounded-xl border border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)] px-3 py-3 text-center"
          data-testid="team-shared-review-load-more-error"
          role="alert"
        >
          <p class="text-xs text-[var(--color-danger)]">
            {{ errorMessage || '下一页团队动态加载失败。' }}
          </p>
          <button
            type="button"
            class="btn-secondary mt-2 rounded-lg px-3 py-1.5 text-xs font-bold"
            data-testid="team-shared-review-load-more-retry"
            @click="emit('load-more')"
          >
            重试加载
          </button>
        </div>

        <button
          v-if="hasMore && phase !== 'load-more-error'"
          type="button"
          class="btn-secondary mt-4 w-full rounded-lg px-3 py-2.5 text-sm font-bold"
          :disabled="busy"
          :aria-busy="phase === 'loading-more' ? 'true' : 'false'"
          data-testid="team-shared-review-load-more"
          @click="emit('load-more')"
        >
          {{ phase === 'loading-more' ? '加载中…' : '加载更多' }}
        </button>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import AppIcon from '@/components/AppIcon.vue'
import SharedWeeklyReviewCard from '@/components/review/SharedWeeklyReviewCard.vue'
import type { TeamContext } from '@/types/team'
import type { SharedWeeklyReview } from '@/types/review'
import type { TeamSharedReviewPhase } from '@/composables/useTeamSharedReviews'

const props = withDefaults(
  defineProps<{
    teams: readonly TeamContext[]
    selectedTeamId: string | null
    records: readonly SharedWeeklyReview[]
    phase: TeamSharedReviewPhase
    errorMessage: string | null
    hasMore: boolean
    busy: boolean
    teamsLoading?: boolean
    teamsError?: string | null
  }>(),
  {
    teamsLoading: false,
    teamsError: null,
  },
)

const emit = defineEmits<{
  (event: 'select-team', teamId: string | null): void
  (event: 'retry-teams'): void
  (event: 'refresh'): void
  (event: 'retry'): void
  (event: 'load-more'): void
}>()

const terminalError = computed(() =>
  props.phase === 'forbidden'
  || props.phase === 'not-found'
  || props.phase === 'authentication-required',
)

const terminalErrorTitle = computed(() => {
  if (props.phase === 'forbidden') return '当前无权查看该团队动态。'
  if (props.phase === 'not-found') return '团队或共享复盘已失效。'
  return '登录状态已失效。'
})

const onTeamChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  emit('select-team', value || null)
}
</script>
