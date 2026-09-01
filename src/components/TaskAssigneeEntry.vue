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
    <div class="flex shrink-0 items-center gap-1">
      <button
        ref="historyButtonRef"
        type="button"
        class="focus-ring rounded-lg px-2 py-1 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-menu-hover)] hover:text-[var(--color-text-primary)]"
        aria-label="查看负责人变更历史"
        data-testid="task-assignee-history"
        @click="emit('request-history')"
      >
        历史
      </button>
      <button
        v-if="assignAllowed"
        ref="changeButtonRef"
        type="button"
        class="focus-ring shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-[var(--color-primary)]"
        aria-label="变更任务负责人"
        data-testid="task-assignee-change"
        @click="emit('request-change')"
      >
        变更
      </button>
      <span
        v-else
        class="shrink-0 text-xs text-[var(--color-text-tertiary)]"
        :title="assignDeniedMessage || '当前任务不可变更负责人。'"
        data-testid="task-assignee-locked"
      >
        仅查看
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { TaskAssigneePresentation } from '@/utils/taskAssigneePresentation'

defineProps<{
  presentation: TaskAssigneePresentation
  assignAllowed: boolean
  assignDeniedMessage: string | null
}>()

const emit = defineEmits<{
  'request-change': []
  'request-history': []
}>()

const changeButtonRef = ref<HTMLButtonElement | null>(null)
const historyButtonRef = ref<HTMLButtonElement | null>(null)

defineExpose({
  focusChangeButton: () => changeButtonRef.value?.focus(),
  focusHistoryButton: () => historyButtonRef.value?.focus(),
})
</script>
