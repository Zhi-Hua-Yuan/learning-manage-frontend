<template>
  <section
    class="rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)] px-3 py-3"
    role="status"
    data-testid="task-status-recovery"
  >
    <p class="text-sm font-semibold text-[var(--color-warning)]">{{ title }}</p>
    <p class="mt-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
      {{ message }}
    </p>
    <div v-if="showActions" class="mt-3 flex flex-wrap justify-end gap-2">
      <button
        v-if="phase === 'uncertain'"
        type="button"
        class="btn-secondary rounded-lg px-3 py-2 text-xs font-semibold"
        data-testid="task-status-retry-request"
        @click="emit('retry')"
      >
        重试原请求
      </button>
      <button
        type="button"
        class="btn-primary rounded-lg px-3 py-2 text-xs font-semibold"
        data-testid="task-status-refresh-facts"
        @click="emit('refresh')"
      >
      {{ phase === 'committed-refresh-error' || phase === 'fact-refresh-error' ? '重新加载最新任务' : '刷新最新状态' }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { TaskStatusMutationPhase } from '@/composables/useTaskStatusMutation'

const props = defineProps<{
  phase: TaskStatusMutationPhase
  message?: string | null
}>()

const emit = defineEmits<{
  retry: []
  refresh: []
}>()

const title = computed(() => {
  if (props.phase === 'uncertain') return '任务状态结果尚未确认'
  if (props.phase === 'committed-refresh-error') return '状态已提交，任务事实尚未刷新'
  if (props.phase === 'fact-refresh-error') return '最新任务状态加载失败'
  if (props.phase === 'submitting') return '正在提交任务状态'
  return '正在核对最新任务状态'
})
const message = computed(() => props.message || (
  props.phase === 'uncertain'
    ? '可以安全重试原请求，系统会复用同一个请求标识；也可以只刷新服务端状态。'
    : '请稍候，完成核对前不会提交新的目标状态。'
))
const showActions = computed(() => (
  props.phase === 'uncertain'
  || props.phase === 'fact-refresh-error'
  || props.phase === 'committed-refresh-error'
))
</script>
