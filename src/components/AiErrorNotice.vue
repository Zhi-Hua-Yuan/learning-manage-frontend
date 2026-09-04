<template>
  <div
    class="space-y-3 rounded-xl border border-[var(--color-danger)]/35 bg-[var(--color-danger-soft)]/45 p-4"
    role="alert"
  >
    <div class="flex items-start gap-3">
      <AppIcon name="warning" class="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-danger)]" />
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-[var(--color-text-primary)]">{{ title }}</p>
        <SafeAiText
          as="p"
          class="mt-1 text-sm text-[var(--color-text-secondary)]"
          :text="presentation.message"
        />
        <div v-if="presentation.traceId" class="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span class="text-[var(--color-text-tertiary)]">追踪编号</span>
          <code class="break-all text-[var(--color-text-secondary)]">{{ presentation.traceId }}</code>
          <button
            type="button"
            class="font-semibold text-[var(--color-ai)] hover:underline"
            @click="copyTraceId"
          >
            {{ copyStatus === 'copied' ? '已复制' : copyStatus === 'failed' ? '复制失败' : '复制' }}
          </button>
        </div>
      </div>
    </div>
    <div v-if="presentation.actionLabel" class="flex justify-end">
      <button
        type="button"
        class="btn-secondary rounded-lg px-4 py-2 text-sm font-bold"
        @click="$emit('action', presentation.action)"
      >
        {{ presentation.actionLabel }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SafeAiText from '@/components/SafeAiText.vue'
import type { AiErrorPresentation, AiRecoveryAction } from '@/utils/aiErrorPresentation'

const props = withDefaults(
  defineProps<{
    presentation: AiErrorPresentation
    title?: string
  }>(),
  { title: 'AI 请求失败' },
)

defineEmits<{
  action: [action: AiRecoveryAction]
}>()

const copyStatus = ref<'idle' | 'copied' | 'failed'>('idle')

const copyTraceId = async () => {
  const traceId = props.presentation.traceId
  if (!traceId || typeof navigator.clipboard?.writeText !== 'function') {
    copyStatus.value = 'failed'
    return
  }
  try {
    await navigator.clipboard.writeText(traceId)
    copyStatus.value = 'copied'
  } catch {
    copyStatus.value = 'failed'
  }
}
</script>
