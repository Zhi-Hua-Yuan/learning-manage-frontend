<template>
  <transition name="assignment-overlay">
    <div
      v-if="open"
      ref="rootRef"
      class="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="descriptionId"
      data-testid="task-assignment-dialog"
    >
      <button
        type="button"
        class="absolute inset-0 cursor-default bg-[var(--color-backdrop-strong)]"
        aria-label="关闭负责人变更对话框"
        :disabled="busy"
        data-testid="task-assignment-backdrop"
        @click="cancel"
      ></button>

      <section
        ref="panelRef"
        class="surface-panel relative z-[var(--z-modal-panel)] w-full max-w-lg overflow-visible rounded-2xl p-6"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <h2 :id="titleId" class="text-xl font-bold text-[var(--color-text-primary)]">
              {{ dialogTitle }}
            </h2>
            <p :id="descriptionId" class="mt-1 truncate text-sm text-[var(--color-text-secondary)]">
              {{ taskTitle }}
            </p>
          </div>
          <button
            type="button"
            class="focus-ring rounded-lg px-2 py-1 text-sm text-[var(--color-text-secondary)]"
            :disabled="busy"
            aria-label="关闭"
            data-testid="task-assignment-close"
            @click="cancel"
          >
            关闭
          </button>
        </div>

        <div class="mt-5 rounded-xl bg-[var(--color-bg-surface-secondary)] p-3">
          <p class="text-xs font-medium text-[var(--color-text-tertiary)]">当前负责人</p>
          <p class="mt-1 text-sm font-semibold text-[var(--color-text-body)]" data-testid="task-assignment-current-assignee">
            {{ currentAssignee.label }}
          </p>
          <p v-if="currentAssignee.description" class="mt-1 text-xs text-[var(--color-text-tertiary)]">
            {{ currentAssignee.description }}
          </p>
        </div>

        <div
          v-if="recoveryMode !== 'none'"
          class="mt-4 rounded-xl bg-[var(--color-warning-soft)] px-3 py-3 text-sm text-[var(--color-text-body)]"
          role="status"
          data-testid="task-assignment-recovery"
        >
          <p class="font-semibold text-[var(--color-warning)]">
            {{ recoveryTitle }}
          </p>
          <template v-if="recoveryMode === 'reconfirm'">
            <dl class="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              <dt class="text-[var(--color-text-tertiary)]">原负责人</dt>
              <dd data-testid="task-assignment-initial-assignee">{{ initialAssigneeLabel || '未分配' }}</dd>
              <dt class="text-[var(--color-text-tertiary)]">最新负责人</dt>
              <dd data-testid="task-assignment-latest-assignee">{{ currentAssignee.label }}</dd>
              <dt class="text-[var(--color-text-tertiary)]">你的目标</dt>
              <dd data-testid="task-assignment-recovery-target">{{ targetLabel }}</dd>
            </dl>
            <p class="mt-2 text-xs text-[var(--color-text-secondary)]">
              请基于最新负责人再次确认，本页面不会自动重试。
            </p>
          </template>
          <p v-else class="mt-1 text-xs text-[var(--color-text-secondary)]">
            {{ recoveryDescription }}
          </p>
        </div>

        <div class="mt-5">
          <label class="mb-2 block text-sm font-medium text-[var(--color-text-secondary)]">目标负责人</label>
          <TaskAssigneePicker
            :model-value="targetAssigneeUserId"
            :options="options"
            :loading="candidatesLoading"
            :disabled="busy"
            :error-message="candidatesErrorMessage"
            trigger-label="选择新的任务负责人"
            @update:model-value="emit('update:targetAssigneeUserId', $event)"
            @retry="emit('retry')"
          />
        </div>

        <div class="mt-5">
          <div class="flex items-center justify-between gap-3">
            <label :for="reasonId" class="text-sm font-medium text-[var(--color-text-secondary)]">
              变更原因（可选）
            </label>
            <span class="text-xs text-[var(--color-text-tertiary)]" data-testid="task-assignment-reason-count">
              {{ reasonLength }} / {{ TASK_ASSIGNMENT_REASON_MAX_LENGTH }}
            </span>
          </div>
          <textarea
            :id="reasonId"
            :value="reason"
            rows="3"
            class="focus-ring mt-2 w-full resize-none rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] p-3 text-sm text-[var(--color-text-body)]"
            placeholder="说明本次负责人调整原因"
            :disabled="busy"
            :aria-invalid="reasonResult.valid ? 'false' : 'true'"
            :aria-describedby="reasonResult.valid ? undefined : reasonErrorId"
            data-testid="task-assignment-reason"
            @input="onReasonInput"
          ></textarea>
          <p
            v-if="!reasonResult.valid"
            :id="reasonErrorId"
            class="mt-2 text-sm text-[var(--color-danger)]"
            role="alert"
            data-testid="task-assignment-reason-error"
          >
            {{ reasonResult.message }}
          </p>
        </div>

        <p class="mt-4 text-sm text-[var(--color-text-secondary)]" data-testid="task-assignment-summary">
          {{ operationSummary }}
        </p>

        <p
          v-if="submissionErrorMessage"
          class="mt-3 rounded-xl bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger)]"
          role="alert"
          data-testid="task-assignment-submit-error"
        >
          {{ submissionErrorMessage }}
        </p>

        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            class="btn-secondary rounded-xl px-4 py-2.5 text-sm font-semibold"
            :disabled="busy"
            data-testid="task-assignment-cancel"
            @click="cancel"
          >
            取消
          </button>
          <button
            v-if="recoveryRequired"
            type="button"
            class="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
            :disabled="busy"
            :class="busy ? 'cursor-not-allowed opacity-70' : ''"
            data-testid="task-assignment-recover"
            @click="recover"
          >
            {{ busy ? '重新加载中…' : recoveryLabel }}
          </button>
          <button
            v-else-if="recoveryMode === 'recovery-error'"
            type="button"
            class="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
            :disabled="busy"
            :class="busy ? 'cursor-not-allowed opacity-70' : ''"
            data-testid="task-assignment-reconcile-retry"
            @click="recover"
          >
            {{ busy ? '正在核对…' : '重新核对最新状态' }}
          </button>
          <button
            v-else-if="recoveryMode === 'reconfirm'"
            type="button"
            class="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
            :disabled="reconfirmDisabled"
            :class="reconfirmDisabled ? 'cursor-not-allowed opacity-70' : ''"
            data-testid="task-assignment-reconfirm"
            @click="reconfirm"
          >
            基于最新负责人再次确认
          </button>
          <button
            v-else-if="recoveryMode === 'none'"
            type="button"
            class="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
            :disabled="confirmDisabled"
            :class="confirmDisabled ? 'cursor-not-allowed opacity-70' : ''"
            data-testid="task-assignment-confirm"
            @click="confirm"
          >
            {{ busy ? '处理中…' : confirmText }}
          </button>
        </div>
      </section>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import TaskAssigneePicker from '@/components/TaskAssigneePicker.vue'
import type { TaskAssigneeOption } from '@/utils/taskAssigneeOptions'
import type { TaskAssigneePresentation } from '@/utils/taskAssigneePresentation'
import {
  normalizeTaskAssignmentReason,
  resolveTaskAssignmentOperation,
  TASK_ASSIGNMENT_REASON_MAX_LENGTH,
} from '@/utils/taskAssignment'

const props = withDefaults(defineProps<{
  open: boolean
  taskTitle: string
  currentAssignee: TaskAssigneePresentation
  targetAssigneeUserId: string | null
  options: readonly TaskAssigneeOption[]
  candidatesLoading?: boolean
  candidatesErrorMessage?: string | null
  reason: string
  busy?: boolean
  submissionBlocked?: boolean
  submissionErrorMessage?: string | null
  recoveryRequired?: boolean
  recoveryLabel?: string
  recoveryMode?: 'none' | 'reconciling' | 'reconfirm' | 'recovery-error'
  recoverySource?: 'CONFLICT' | 'UNCERTAIN' | null
  initialAssigneeLabel?: string | null
}>(), {
  candidatesLoading: false,
  candidatesErrorMessage: null,
  busy: false,
  submissionBlocked: false,
  submissionErrorMessage: null,
  recoveryRequired: false,
  recoveryLabel: '重新加载最新任务',
  recoveryMode: 'none',
  recoverySource: null,
  initialAssigneeLabel: null,
})

const emit = defineEmits<{
  'update:targetAssigneeUserId': [value: string | null]
  'update:reason': [value: string]
  retry: []
  recover: []
  reconfirm: [{ targetAssigneeUserId: string | null; reason?: string }]
  cancel: []
  confirm: [{ targetAssigneeUserId: string | null; reason?: string }]
}>()

const panelRef = ref<HTMLElement | null>(null)
const instanceId = `task-assignment-${Math.random().toString(36).slice(2)}`
const titleId = `${instanceId}-title`
const descriptionId = `${instanceId}-description`
const reasonId = `${instanceId}-reason`
const reasonErrorId = `${instanceId}-reason-error`

const operation = computed(() => resolveTaskAssignmentOperation(
  props.currentAssignee.userId,
  props.targetAssigneeUserId,
))
const reasonResult = computed(() => normalizeTaskAssignmentReason(props.reason))
const reasonLength = computed(() => props.reason.trim().length)
const selectedTarget = computed(() => props.options.find(
  (option) => option.value === props.targetAssigneeUserId,
))
const targetLabel = computed(() => selectedTarget.value?.label
  ?? (props.targetAssigneeUserId ? `用户 #${props.targetAssigneeUserId}` : '未分配'))
const dialogTitle = computed(() => {
  if (operation.value === 'ASSIGN') return '分配负责人'
  if (operation.value === 'REASSIGN') return '转派负责人'
  if (operation.value === 'UNASSIGN') return '解除分配'
  return '变更负责人'
})
const confirmText = computed(() => operation.value === 'NO_CHANGE' ? '未发生变化' : dialogTitle.value)
const operationSummary = computed(() => {
  if (operation.value === 'NO_CHANGE') return '请选择不同的负责人后再确认。'
  if (operation.value === 'UNASSIGN') return `将解除 ${props.currentAssignee.label} 的任务负责人身份。`
  return `将负责人从 ${props.currentAssignee.label} 变更为 ${targetLabel.value}。`
})
const targetSelectable = computed(() => {
  if (operation.value === 'NO_CHANGE') return true
  return props.options.some((option) => (
    option.value === props.targetAssigneeUserId && !option.disabled
  ))
})
const confirmDisabled = computed(() => (
  props.busy
  || props.submissionBlocked
  || props.candidatesLoading
  || Boolean(props.candidatesErrorMessage)
  || operation.value === 'NO_CHANGE'
  || !reasonResult.value.valid
  || !targetSelectable.value
))
const reconfirmDisabled = computed(() => (
  props.busy
  || props.candidatesLoading
  || Boolean(props.candidatesErrorMessage)
  || operation.value === 'NO_CHANGE'
  || !reasonResult.value.valid
  || !targetSelectable.value
))
const recoveryTitle = computed(() => {
  if (props.recoveryMode === 'reconfirm') {
    return props.recoverySource === 'CONFLICT'
      ? '任务负责人已被其他操作修改'
      : '已核对最新负责人状态'
  }
  if (props.recoveryMode === 'recovery-error') return '最新负责人状态暂时无法确认'
  return props.recoverySource === 'CONFLICT'
    ? '正在核对冲突后的最新负责人…'
    : '正在核对请求是否已经生效…'
})
const recoveryDescription = computed(() => (
  props.recoveryMode === 'recovery-error'
    ? '请先重新核对任务事实；在核对完成前不会再次提交负责人变更。'
    : '目标负责人和变更原因已保留，请稍候。'
))

const onReasonInput = (event: Event) => {
  emit('update:reason', (event.target as HTMLTextAreaElement).value)
}

const cancel = () => {
  if (!props.busy) emit('cancel')
}

const confirm = () => {
  if (confirmDisabled.value || !reasonResult.value.valid) return
  emit('confirm', {
    targetAssigneeUserId: props.targetAssigneeUserId,
    reason: reasonResult.value.value,
  })
}

const recover = () => {
  if (
    !props.busy
    && (props.recoveryRequired || props.recoveryMode === 'recovery-error')
  ) emit('recover')
}

const reconfirm = () => {
  if (reconfirmDisabled.value || !reasonResult.value.valid) return
  emit('reconfirm', {
    targetAssigneeUserId: props.targetAssigneeUserId,
    reason: reasonResult.value.value,
  })
}

const getFocusableElements = () => Array.from(
  panelRef.value?.querySelectorAll<HTMLElement>(
    'button:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  ) ?? [],
).filter((element) => !element.hasAttribute('disabled'))

const focusFirstControl = async () => {
  await nextTick()
  const pickerTrigger = panelRef.value?.querySelector<HTMLElement>(
    '[data-testid="task-assignee-picker-trigger"]',
  )
  pickerTrigger?.focus()
}

const onDocumentKeydown = (event: KeyboardEvent) => {
  if (!props.open) return
  if (event.key === 'Escape') {
    event.preventDefault()
    cancel()
    return
  }
  if (event.key !== 'Tab') return

  const focusable = getFocusableElements()
  if (focusable.length === 0) return
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

watch(() => props.open, (open) => {
  if (open) void focusFirstControl()
})

onMounted(() => document.addEventListener('keydown', onDocumentKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onDocumentKeydown))
</script>
