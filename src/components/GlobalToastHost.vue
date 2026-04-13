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
      class="pointer-events-auto flex items-start gap-3 rounded-xl border-l-4 bg-white p-4 text-gray-700 shadow-xl"
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
        class="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
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
      return 'border-emerald-500'
    case 'error':
      return 'border-red-500'
    case 'warning':
      return 'border-amber-500'
    default:
      return 'border-blue-500'
  }
}

const getIconClass = (type: ToastType) => {
  switch (type) {
    case 'success':
      return 'bg-emerald-100 text-emerald-600'
    case 'error':
      return 'bg-red-100 text-red-600'
    case 'warning':
      return 'bg-amber-100 text-amber-600'
    default:
      return 'bg-blue-100 text-blue-600'
  }
}

const getActionClass = (type: ToastType) => {
  switch (type) {
    case 'success':
      return 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
    case 'error':
      return 'bg-red-50 text-red-700 hover:bg-red-100'
    case 'warning':
      return 'bg-amber-50 text-amber-700 hover:bg-amber-100'
    default:
      return 'bg-blue-50 text-blue-700 hover:bg-blue-100'
  }
}
</script>
