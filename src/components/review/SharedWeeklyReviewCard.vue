<template>
  <article
    class="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4 shadow-sm"
    data-testid="shared-weekly-review-card"
  >
    <header class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="flex items-center gap-2 text-sm font-bold text-[var(--color-text-primary)]">
          <AppIcon name="document" class="h-4 w-4 shrink-0" aria-hidden="true" />
          <span data-testid="shared-weekly-review-author">{{ authorName }}</span>
        </p>
        <p class="mt-1 text-xs text-[var(--color-text-secondary)]" data-testid="shared-weekly-review-week">
          {{ weekLabel }}
        </p>
      </div>

      <time
        v-if="review.updateTime"
        class="shrink-0 text-xs text-[var(--color-text-tertiary)]"
        :datetime="review.updateTime"
        data-testid="shared-weekly-review-updated-at"
      >
        更新于 {{ formatTimestamp(review.updateTime) }}
      </time>
    </header>

    <p
      class="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--color-text-body)]"
      data-testid="shared-weekly-review-summary"
    >
      {{ summaryText }}
    </p>

    <footer class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-text-secondary)]">
      <span v-if="dateRange" class="inline-flex items-center gap-1" data-testid="shared-weekly-review-date-range">
        <AppIcon name="calendar" class="h-3.5 w-3.5" aria-hidden="true" />
        {{ dateRange }}
      </span>
      <span
        v-if="review.focusProject?.name"
        class="inline-flex min-w-0 items-center gap-1"
        data-testid="shared-weekly-review-focus-project"
      >
        <AppIcon name="folder" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span class="truncate">重点项目：{{ review.focusProject.name }}</span>
      </span>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import AppIcon from '@/components/AppIcon.vue'
import type { SharedWeeklyReview } from '@/types/review'

const props = defineProps<{
  review: SharedWeeklyReview
}>()

const authorName = computed(() => props.review.author.username?.trim() || '团队成员')

const weekLabel = computed(() => {
  const { year, weekNo } = props.review
  return year > 0 && weekNo > 0 ? `${year} 年第 ${weekNo} 周` : '周次未知'
})

const dateRange = computed(() => {
  const { startDate, endDate } = props.review
  if (!startDate && !endDate) return ''
  if (!startDate) return `至 ${endDate}`
  if (!endDate) return `${startDate} 起`
  return `${startDate} 至 ${endDate}`
})

const summaryText = computed(() => props.review.sharedSummary?.trim() || '共享摘要暂不可用')

const formatTimestamp = (value: string) => {
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) return value

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}
</script>
