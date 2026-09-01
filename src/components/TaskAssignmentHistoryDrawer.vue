<template>
  <transition name="assignment-history-drawer">
    <div
      v-if="open"
      ref="rootRef"
      class="fixed inset-0 z-[var(--z-modal)]"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      data-testid="task-assignment-history-drawer"
    >
      <button
        type="button"
        class="absolute inset-0 cursor-default bg-[var(--color-backdrop-strong)]"
        aria-label="关闭负责人历史"
        data-testid="task-assignment-history-backdrop"
        @click="emit('close')"
      ></button>

      <aside
        ref="panelRef"
        class="surface-panel absolute inset-y-0 right-0 z-[var(--z-modal-panel)] flex w-full max-w-md flex-col border-l border-[var(--color-border-default)] shadow-[var(--shadow-card)]"
        @click.stop
      >
        <header
          class="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--color-divider-muted)] p-4"
        >
          <div class="min-w-0">
            <h2 :id="titleId" class="text-lg font-bold text-[var(--color-text-primary)]">
              负责人变更历史
            </h2>
            <p
              class="mt-1 truncate text-sm text-[var(--color-text-secondary)]"
              data-testid="task-assignment-history-title"
            >
              {{ taskTitle || '当前任务' }}
            </p>
          </div>
          <button
            ref="closeButtonRef"
            type="button"
            class="focus-ring shrink-0 rounded-lg px-2 py-1 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-menu-hover)] hover:text-[var(--color-text-primary)]"
            aria-label="关闭负责人历史"
            data-testid="task-assignment-history-close"
            @click="emit('close')"
          >
            关闭
          </button>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto p-4" aria-live="polite">
          <div
            v-if="phase === 'loading' || phase === 'refreshing'"
            class="space-y-3"
            data-testid="task-assignment-history-loading"
            role="status"
          >
            <div
              v-for="index in 3"
              :key="index"
              class="animate-pulse rounded-xl bg-[var(--color-bg-surface-muted)] p-4"
            >
              <div class="h-3 w-32 rounded bg-[var(--color-border-default)]"></div>
              <div class="mt-3 h-3 w-48 rounded bg-[var(--color-border-default)]"></div>
              <div class="mt-2 h-3 w-40 rounded bg-[var(--color-border-default)]"></div>
            </div>
          </div>

          <div
            v-else-if="phase === 'forbidden'"
            class="flex min-h-48 flex-col items-center justify-center rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface-muted)] px-5 text-center"
            data-testid="task-assignment-history-forbidden"
            role="status"
          >
            <p class="text-sm font-semibold text-[var(--color-text-primary)]">
              当前无权查看负责人历史
            </p>
            <p class="mt-2 text-xs text-[var(--color-text-secondary)]">
              任务权限可能刚刚发生变化，请关闭后重新读取任务。
            </p>
          </div>

          <div
            v-else-if="phase === 'not-found'"
            class="flex min-h-48 flex-col items-center justify-center rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface-muted)] px-5 text-center"
            data-testid="task-assignment-history-not-found"
            role="status"
          >
            <p class="text-sm font-semibold text-[var(--color-text-primary)]">
              任务已不存在或当前不可访问
            </p>
            <p class="mt-2 text-xs text-[var(--color-text-secondary)]">
              请返回任务列表后重新加载。
            </p>
          </div>

          <div
            v-else-if="phase === 'error' && records.length === 0"
            class="flex min-h-48 flex-col items-center justify-center rounded-xl border border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)] px-5 text-center"
            data-testid="task-assignment-history-error"
            role="alert"
          >
            <p class="text-sm font-semibold text-[var(--color-danger)]">
              {{ errorMessage || '负责人历史无法加载。' }}
            </p>
            <button
              type="button"
              class="btn-secondary mt-4 rounded-lg px-3 py-2 text-xs font-semibold"
              data-testid="task-assignment-history-retry"
              @click="emit('retry')"
            >
              重新加载
            </button>
          </div>

          <div v-else-if="records.length === 0" data-testid="task-assignment-history-empty">
            <div
              class="flex min-h-48 flex-col items-center justify-center rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface-muted)] px-5 text-center"
            >
              <p class="text-sm font-semibold text-[var(--color-text-primary)]">
                暂无负责人变更记录
              </p>
              <p class="mt-2 text-xs text-[var(--color-text-secondary)]">
                负责人发生变更后，记录会显示在这里。
              </p>
            </div>
          </div>

          <ol v-else class="relative space-y-3" data-testid="task-assignment-history-list">
            <li
              v-for="record in records"
              :key="record.id"
              class="relative rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-4"
              data-testid="task-assignment-history-item"
            >
              <div class="flex items-start justify-between gap-3">
                <p class="text-sm font-semibold text-[var(--color-text-primary)]">
                  {{ resolveTaskAssignmentActionLabel(record.action) }}
                </p>
                <time
                  v-if="record.createTime"
                  class="shrink-0 text-xs text-[var(--color-text-tertiary)]"
                  :datetime="record.createTime"
                >
                  {{ formatTime(record.createTime) }}
                </time>
                <span v-else class="shrink-0 text-xs text-[var(--color-text-tertiary)]"
                  >时间未知</span
                >
              </div>

              <p
                class="mt-2 text-sm text-[var(--color-text-body)]"
                data-testid="task-assignment-history-change"
              >
                {{ resolveTaskAssignmentUserLabel(record.fromAssignee) }}
                <span class="mx-1 text-[var(--color-text-tertiary)]" aria-hidden="true">→</span>
                {{ resolveTaskAssignmentUserLabel(record.toAssignee) }}
              </p>

              <p class="mt-2 text-xs text-[var(--color-text-secondary)]">
                操作人：{{ resolveTaskAssignmentUserLabel(record.assignedBy) }}
              </p>

              <p
                v-if="resolveTaskAssignmentReason(record.reason)"
                class="mt-3 whitespace-pre-wrap break-words rounded-lg bg-[var(--color-bg-surface-muted)] px-3 py-2 text-xs leading-relaxed text-[var(--color-text-body)]"
                data-testid="task-assignment-history-reason"
              >
                {{ resolveTaskAssignmentReason(record.reason) }}
              </p>
            </li>
          </ol>

          <div
            v-if="phase === 'load-more-error'"
            class="mt-3 rounded-xl border border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)] px-3 py-3 text-center"
            data-testid="task-assignment-history-load-more-error"
            role="alert"
          >
            <p class="text-xs text-[var(--color-danger)]">
              {{ errorMessage || '下一页历史加载失败。' }}
            </p>
            <button
              type="button"
              class="btn-secondary mt-2 rounded-lg px-3 py-1.5 text-xs font-semibold"
              data-testid="task-assignment-history-load-more-retry"
              @click="emit('retry')"
            >
              重试加载
            </button>
          </div>
        </div>

        <footer
          v-if="records.length > 0 || phase === 'loading-more' || phase === 'load-more-error'"
          class="shrink-0 border-t border-[var(--color-divider-muted)] p-4"
        >
          <button
            v-if="hasMore && phase !== 'load-more-error'"
            type="button"
            class="btn-secondary w-full rounded-lg px-3 py-2.5 text-sm font-semibold"
            :disabled="phase === 'loading-more'"
            :aria-busy="phase === 'loading-more' ? 'true' : 'false'"
            data-testid="task-assignment-history-load-more"
            @click="emit('load-more')"
          >
            {{ phase === 'loading-more' ? '加载中…' : '加载更多' }}
          </button>
          <p
            v-else-if="records.length > 0 && phase !== 'load-more-error'"
            class="text-center text-xs text-[var(--color-text-tertiary)]"
          >
            已显示全部负责人变更记录
          </p>
        </footer>
      </aside>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { TaskAssignmentHistory } from '@/types/task'
import type { TaskAssignmentHistoryPhase } from '@/composables/useTaskAssignmentHistory'
import {
  resolveTaskAssignmentActionLabel,
  resolveTaskAssignmentReason,
  resolveTaskAssignmentUserLabel,
} from '@/utils/taskAssignmentHistory'

const props = defineProps<{
  open: boolean
  taskTitle: string
  records: readonly TaskAssignmentHistory[]
  phase: TaskAssignmentHistoryPhase
  errorMessage: string | null
  hasMore: boolean
  total: number
}>()

const emit = defineEmits<{
  close: []
  retry: []
  'load-more': []
}>()

const rootRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const closeButtonRef = ref<HTMLButtonElement | null>(null)
const instanceId = `task-assignment-history-${Math.random().toString(36).slice(2)}`
const titleId = `${instanceId}-title`

const formatTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间未知'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const getFocusableElements = () =>
  Array.from(
    panelRef.value?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? [],
  ).filter((element) => !element.hasAttribute('disabled'))

const focusInitialElement = async () => {
  await nextTick()
  closeButtonRef.value?.focus()
}

const onDocumentKeydown = (event: KeyboardEvent) => {
  if (!props.open) return

  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }
  if (event.key !== 'Tab') return

  const focusable = getFocusableElements()
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (!first || !last) return

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) void focusInitialElement()
  },
)

onMounted(() => document.addEventListener('keydown', onDocumentKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onDocumentKeydown))

defineExpose({ focusInitialElement })
</script>
