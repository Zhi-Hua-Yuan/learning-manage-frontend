<template>
  <TransitionGroup
    tag="div"
    class="pointer-events-none fixed top-4 right-4 z-[120] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:top-6 sm:right-6"
    enter-active-class="transform ease-out duration-200 transition"
    enter-from-class="translate-y-2 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition ease-in duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-for="toast in toastStore.toasts"
      :key="toast.id"
      class="toast-item pointer-events-auto flex items-start gap-3 rounded-xl border-l-4 p-4"
      :class="getContainerClass(toast.type)"
      role="status"
      aria-live="polite"
    >
      <div
        class="mt-0.5 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-base"
        :class="getIconClass(toast.type)"
      >
        {{ getIcon(toast.type) }}
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-bold leading-5">{{ toast.message }}</p>
        <div v-if="toast.action" class="mt-2">
          <button
            type="button"
            class="rounded-md px-2 py-1 text-xs font-semibold transition-colors"
            :class="getActionClass(toast.type)"
            @click="toastStore.triggerAction(toast.id)"
          >
            {{ toast.action.label }}
          </button>
        </div>
      </div>
      <button
        type="button"
        class="toast-close rounded-md p-1 transition-colors"
        @click="toastStore.dismiss(toast.id)"
      >
        ✕
      </button>
    </div>
  </TransitionGroup>
</template>

<script setup lang="ts">
import { useToastStore, type ToastType } from '@/stores/toast'

const toastStore = useToastStore()

const getIcon = (type: ToastType) => {
  switch (type) {
    case 'success':
      return '✅'
    case 'error':
      return '⚠️'
    case 'warning':
      return '⚠️'
    default:
      return 'ℹ️'
  }
}

const getContainerClass = (type: ToastType) => {
  switch (type) {
    case 'success':
      return 'toast-item--success'
    case 'error':
      return 'toast-item--error'
    case 'warning':
      return 'toast-item--warning'
    default:
      return 'toast-item--info'
  }
}

const getIconClass = (type: ToastType) => {
  switch (type) {
    case 'success':
      return 'toast-icon--success'
    case 'error':
      return 'toast-icon--error'
    case 'warning':
      return 'toast-icon--warning'
    default:
      return 'toast-icon--info'
  }
}

const getActionClass = (type: ToastType) => {
  switch (type) {
    case 'success':
      return 'toast-action toast-action--success'
    case 'error':
      return 'toast-action toast-action--error'
    case 'warning':
      return 'toast-action toast-action--warning'
    default:
      return 'toast-action toast-action--info'
  }
}
</script>

<style scoped>
.toast-item {
  background: var(--color-popover-bg);
  border-color: var(--color-popover-border);
  color: var(--color-text-body);
  box-shadow: var(--shadow-overlay);
}

.toast-item--success {
  border-left-color: var(--color-success);
}

.toast-item--error {
  border-left-color: var(--color-danger);
}

.toast-item--warning {
  border-left-color: var(--color-warning);
}

.toast-item--info {
  border-left-color: var(--color-primary);
}

.toast-icon--success {
  background: var(--color-success-soft);
  color: var(--color-success);
}

.toast-icon--error {
  background: var(--color-danger-soft);
  color: var(--color-danger);
}

.toast-icon--warning {
  background: var(--color-warning-soft);
  color: var(--color-warning);
}

.toast-icon--info {
  background: var(--color-primary-soft-2);
  color: var(--color-primary);
}

.toast-action {
  color: var(--color-text-primary);
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);
}

.toast-action--success {
  background: var(--color-success-soft);
}

.toast-action--success:hover {
  background: var(--color-success);
  color: var(--color-text-on-accent);
}

.toast-action--error {
  background: var(--color-danger-soft);
}

.toast-action--error:hover {
  background: var(--color-danger);
  color: var(--color-text-on-accent);
}

.toast-action--warning {
  background: var(--color-warning-soft);
}

.toast-action--warning:hover {
  background: var(--color-warning);
  color: var(--color-text-primary);
}

.toast-action--info {
  background: var(--color-primary-soft-2);
}

.toast-action--info:hover {
  background: var(--color-primary);
  color: var(--color-text-on-accent);
}

.toast-close {
  color: var(--color-text-secondary);
}

.toast-close:hover {
  background: var(--color-menu-hover);
  color: var(--color-text-body);
}
</style>
