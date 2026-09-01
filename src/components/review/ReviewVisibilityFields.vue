<template>
  <section
    class="space-y-4 rounded-2xl border border-[var(--color-input-border)] bg-[var(--color-bg-surface-muted)] p-4"
    aria-labelledby="review-visibility-heading"
    data-testid="review-visibility-fields"
  >
    <fieldset ref="visibilityFieldsetRef" :disabled="disabled">
      <legend id="review-visibility-heading" class="text-sm font-bold text-[var(--color-text-body)]">
        复盘可见性
      </legend>
      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <label
          class="focus-within:ring-2 focus-within:ring-[var(--color-primary)] flex cursor-pointer gap-3 rounded-xl border p-3"
          :class="visibilityScope === 'PRIVATE'
            ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft-2)]'
            : 'border-[var(--color-input-border)] bg-[var(--color-bg-surface)]'"
        >
          <input
            type="radio"
            name="weekly-review-visibility"
            value="PRIVATE"
            :checked="visibilityScope === 'PRIVATE'"
            data-testid="review-visibility-private"
            @change="emit('update:visibilityScope', 'PRIVATE')"
          />
          <span>
            <span class="block text-sm font-bold text-[var(--color-text-primary)]">仅自己可见</span>
            <span class="mt-1 block text-xs text-[var(--color-text-secondary)]">
              不会出现在任何团队的动态中。
            </span>
          </span>
        </label>

        <label
          class="focus-within:ring-2 focus-within:ring-[var(--color-primary)] flex cursor-pointer gap-3 rounded-xl border p-3"
          :class="visibilityScope === 'TEAM'
            ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft-2)]'
            : 'border-[var(--color-input-border)] bg-[var(--color-bg-surface)]'"
        >
          <input
            type="radio"
            name="weekly-review-visibility"
            value="TEAM"
            :checked="visibilityScope === 'TEAM'"
            data-testid="review-visibility-team"
            @change="emit('update:visibilityScope', 'TEAM')"
          />
          <span>
            <span class="block text-sm font-bold text-[var(--color-text-primary)]">向团队共享摘要</span>
            <span class="mt-1 block text-xs text-[var(--color-text-secondary)]">
              只发布单独填写的共享摘要。
            </span>
          </span>
        </label>
      </div>
    </fieldset>

    <p
      v-if="visibilityScope === 'UNKNOWN'"
      class="rounded-xl bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]"
      role="alert"
      data-testid="review-visibility-unknown"
    >
      当前复盘可见性异常，请刷新后重试。
    </p>

    <p
      v-if="visibilityScope === 'PRIVATE'"
      class="rounded-xl bg-[var(--color-bg-surface-secondary)] px-3 py-2 text-sm text-[var(--color-text-secondary)]"
      data-testid="review-private-notice"
    >
      本周复盘仅自己可见，不会出现在团队动态中。
    </p>

    <div v-if="visibilityScope === 'TEAM'" class="space-y-4" data-testid="review-team-fields">
      <div>
        <label :for="teamSelectId" class="block text-sm font-bold text-[var(--color-text-body)]">
          共享团队
        </label>
        <select
          ref="teamSelectRef"
          :id="teamSelectId"
          :value="teamId ?? ''"
          class="focus-ring mt-2 w-full rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] px-3 py-2.5 text-sm text-[var(--color-text-body)]"
          :disabled="disabled || teamsLoading || Boolean(teamsError) || teams.length === 0"
          :aria-invalid="teamIssue ? 'true' : 'false'"
          :aria-describedby="teamDescribedBy"
          data-testid="review-team-select"
          @change="onTeamChange"
        >
          <option value="">请选择团队</option>
          <option v-for="team in teams" :key="team.id" :value="team.id">
            {{ team.name }}
          </option>
        </select>
        <p v-if="teamsLoading" :id="teamStatusId" class="mt-2 text-xs text-[var(--color-text-secondary)]" role="status">
          正在加载可用团队…
        </p>
        <div v-else-if="teamsError" :id="teamStatusId" class="mt-2 flex flex-wrap items-center gap-2">
          <p class="text-sm text-[var(--color-danger)]" role="alert">{{ teamsError }}</p>
          <button
            type="button"
            class="btn-secondary rounded-lg px-3 py-1.5 text-xs font-bold"
            :disabled="disabled"
            data-testid="review-team-retry"
            @click="emit('retryTeams')"
          >
            重新加载团队
          </button>
        </div>
        <p
          v-else-if="teams.length === 0"
          :id="teamStatusId"
          class="mt-2 text-sm text-[var(--color-warning)]"
          role="status"
        >
          当前没有可用于共享的团队，你仍可切换为仅自己可见后保存。
        </p>
        <p
          v-if="teamIssue"
          :id="teamErrorId"
          class="mt-2 text-sm text-[var(--color-danger)]"
          role="alert"
          data-testid="review-team-error"
        >
          {{ teamIssue }}
        </p>
      </div>

      <div>
        <div class="flex items-center justify-between gap-3">
          <label :for="summaryId" class="text-sm font-bold text-[var(--color-text-body)]">
            团队共享摘要
          </label>
          <span class="text-xs text-[var(--color-text-tertiary)]" data-testid="review-summary-count">
            当前 {{ sharedSummary.length }} 字
          </span>
        </div>
        <textarea
          ref="summaryRef"
          :id="summaryId"
          :value="sharedSummary"
          rows="4"
          class="focus-ring mt-2 w-full resize-y rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] p-3 text-sm text-[var(--color-text-body)]"
          placeholder="填写一段专门向团队公开的摘要"
          :disabled="disabled"
          :aria-invalid="summaryIssue ? 'true' : 'false'"
          :aria-describedby="summaryDescribedBy"
          data-testid="review-shared-summary"
          @input="onSummaryInput"
        ></textarea>
        <p
          v-if="summaryIssue"
          :id="summaryErrorId"
          class="mt-2 text-sm text-[var(--color-danger)]"
          role="alert"
          data-testid="review-summary-error"
        >
          {{ summaryIssue }}
        </p>
      </div>

      <p
        :id="privacyNoticeId"
        class="rounded-xl bg-[var(--color-primary-soft-2)] px-3 py-3 text-sm leading-relaxed text-[var(--color-text-body)]"
        data-testid="review-team-privacy-notice"
      >
        仅向所选团队共享摘要。本周复盘、下周计划和关联任务仍然只有你自己可见。
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

import type { NormalizedReviewVisibilityScope, ReviewWriteVisibilityScope } from '@/types/review'
import type { TeamContext } from '@/types/team'
import type { WeeklyReviewFormIssue } from '@/utils/weeklyReviewForm'

const props = withDefaults(defineProps<{
  visibilityScope: NormalizedReviewVisibilityScope
  teamId: string | null
  sharedSummary: string
  teams: readonly TeamContext[]
  teamsLoading?: boolean
  teamsError?: string | null
  issues?: readonly WeeklyReviewFormIssue[]
  disabled?: boolean
}>(), {
  teamsLoading: false,
  teamsError: null,
  issues: () => [],
  disabled: false,
})

const emit = defineEmits<{
  'update:visibilityScope': [value: ReviewWriteVisibilityScope]
  'update:teamId': [value: string | null]
  'update:sharedSummary': [value: string]
  retryTeams: []
}>()

const instanceId = `review-visibility-${Math.random().toString(36).slice(2)}`
const teamSelectId = `${instanceId}-team`
const teamErrorId = `${instanceId}-team-error`
const teamStatusId = `${instanceId}-team-status`
const summaryId = `${instanceId}-summary`
const summaryErrorId = `${instanceId}-summary-error`
const privacyNoticeId = `${instanceId}-privacy-notice`
const visibilityFieldsetRef = ref<HTMLFieldSetElement | null>(null)
const teamSelectRef = ref<HTMLSelectElement | null>(null)
const summaryRef = ref<HTMLTextAreaElement | null>(null)

const issueMessage = (field: WeeklyReviewFormIssue['field']) => {
  const issue = props.issues.find((value) => value.field === field)
  if (!issue) return ''
  if (issue.code === 'TEAM_REQUIRED') return '请选择要共享到的团队。'
  if (issue.code === 'INVALID_TEAM_ID') return '当前团队无效，请重新选择。'
  if (issue.code === 'SHARED_SUMMARY_REQUIRED') return '请填写团队共享摘要。'
  return ''
}

const teamIssue = computed(() => issueMessage('teamId'))
const summaryIssue = computed(() => issueMessage('sharedSummary'))
const teamDescribedBy = computed(() => [
  teamIssue.value ? teamErrorId : '',
  props.teamsLoading || props.teamsError || props.teams.length === 0 ? teamStatusId : '',
].filter(Boolean).join(' ') || undefined)
const summaryDescribedBy = computed(() => [
  summaryIssue.value ? summaryErrorId : '',
  privacyNoticeId,
].filter(Boolean).join(' '))

const onTeamChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  emit('update:teamId', value || null)
}

const onSummaryInput = (event: Event) => {
  emit('update:sharedSummary', (event.target as HTMLTextAreaElement).value)
}

const focusIssue = async (field: WeeklyReviewFormIssue['field']) => {
  await nextTick()
  if (field === 'teamId') {
    teamSelectRef.value?.focus()
    return
  }
  if (field === 'sharedSummary') {
    summaryRef.value?.focus()
    return
  }
  if (field === 'visibilityScope') {
    visibilityFieldsetRef.value?.querySelector<HTMLInputElement>('input[type="radio"]')?.focus()
  }
}

defineExpose({ focusIssue })
</script>
