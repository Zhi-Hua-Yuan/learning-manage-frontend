<template>
  <div
    class="flex items-center gap-3 border-b border-[var(--color-divider-muted)] py-3"
    data-testid="task-assignee-entry"
  >
    <span
      class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-surface-muted)] text-xs text-[var(--color-text-secondary)]"
      aria-hidden="true"
    >
      {{ presentation.kind === 'unassigned' ? '—' : '人' }}
    </span>
    <span class="w-20 shrink-0 text-sm font-medium text-[var(--color-text-secondary)]">负责人</span>
    <div class="min-w-0 flex-1">
      <p
        class="truncate text-sm text-[var(--color-text-body)]"
        :title="presentation.label"
        data-testid="task-assignee-label"
      >
        {{ presentation.label }}
      </p>
      <p
        v-if="presentation.description"
        class="mt-0.5 text-xs text-[var(--color-text-tertiary)]"
        data-testid="task-assignee-description"
      >
        {{ presentation.description }}
      </p>
    </div>
    <span
      v-if="presentation.kind === 'inactive'"
      class="shrink-0 rounded-full bg-[var(--color-warning-soft)] px-2 py-1 text-[11px] font-medium text-[var(--color-warning)]"
      data-testid="task-assignee-inactive"
    >
      已不在团队
    </span>
    <span
      v-if="!assignAllowed"
      class="shrink-0 text-xs text-[var(--color-text-tertiary)]"
      :title="assignDeniedMessage || '当前任务不可变更负责人。'"
      data-testid="task-assignee-locked"
    >
      仅查看
    </span>
  </div>
</template>

<script setup lang="ts">
import type { TaskAssigneePresentation } from '@/utils/taskAssigneePresentation'

defineProps<{
  presentation: TaskAssigneePresentation
  assignAllowed: boolean
  assignDeniedMessage: string | null
}>()
</script>
