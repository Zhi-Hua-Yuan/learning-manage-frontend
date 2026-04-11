<template>
  <transition name="confirm-overlay">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[110] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
    >
      <div
        class="confirm-backdrop absolute inset-0"
        @click="handleCancel"
      >
        <div class="confirm-backdrop-base absolute inset-0"></div>
        <div class="confirm-backdrop-blur absolute inset-0"></div>
      </div>

      <div
        class="confirm-panel relative z-[111] w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl"
        @click.stop
      >
        <div class="h-1.5 w-full" :class="headerClass"></div>
        <div class="p-6 text-center">
          <div
            class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-2xl"
            :class="iconContainerClass"
          >
            {{ icon }}
          </div>
          <h3 class="mb-2 text-xl font-bold text-gray-800">{{ title }}</h3>
          <p v-if="message" class="whitespace-pre-line text-sm leading-relaxed text-gray-500">
            {{ message }}
          </p>
        </div>

        <div class="flex gap-3 p-4">
          <button
            type="button"
            class="btn-secondary flex-1 rounded-xl"
            :disabled="loading"
            :class="loading ? 'cursor-not-allowed opacity-70' : ''"
            @click="handleCancel"
          >
            {{ cancelText }}
          </button>
          <button
            type="button"
            class="flex-1 rounded-xl"
            :class="confirmButtonClass"
            :disabled="loading"
            @click="handleConfirm"
          >
            {{ loading ? '处理中...' : confirmText }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'

type ConfirmVariant = 'primary' | 'danger'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    message?: string
    confirmText?: string
    cancelText?: string
    icon?: string
    variant?: ConfirmVariant
    loading?: boolean
  }>(),
  {
    message: '',
    confirmText: '确认',
    cancelText: '取消',
    icon: '',
    variant: 'primary',
    loading: false,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'confirm'): void
  (event: 'cancel'): void
}>()

const isDanger = computed(() => props.variant === 'danger')

const headerClass = computed(() => (isDanger.value ? 'bg-red-500' : 'bg-blue-500'))
const iconContainerClass = computed(() => (isDanger.value ? 'bg-red-50' : 'bg-blue-50'))
const confirmButtonClass = computed(() => {
  const baseClass = isDanger.value ? 'btn-danger' : 'btn-primary'
  if (props.loading) return `${baseClass} cursor-not-allowed opacity-70`
  return baseClass
})
const icon = computed(() => {
  if (props.icon) return props.icon
  return isDanger.value ? '🗑️' : '⚠️'
})

const handleCancel = () => {
  if (props.loading) return
  emit('cancel')
  emit('update:modelValue', false)
}

const handleConfirm = () => {
  if (props.loading) return
  emit('confirm')
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.modelValue) {
    handleCancel()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.confirm-backdrop {
  overflow: hidden;
}

.confirm-backdrop-base {
  background-color: rgb(17 24 39 / 40%);
  opacity: 1;
}

.confirm-backdrop-blur {
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  opacity: 1;
}

.confirm-panel {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.confirm-overlay-enter-active .confirm-backdrop-base,
.confirm-overlay-leave-active .confirm-backdrop-base,
.confirm-overlay-enter-active .confirm-backdrop-blur,
.confirm-overlay-leave-active .confirm-backdrop-blur {
  transition: opacity 220ms var(--ease-standard);
}

.confirm-overlay-enter-from .confirm-backdrop-base,
.confirm-overlay-leave-to .confirm-backdrop-base,
.confirm-overlay-enter-from .confirm-backdrop-blur,
.confirm-overlay-leave-to .confirm-backdrop-blur {
  opacity: 0;
}

.confirm-overlay-enter-active .confirm-panel,
.confirm-overlay-leave-active .confirm-panel {
  transition:
    opacity var(--motion-base) var(--ease-standard),
    transform var(--motion-base) var(--ease-standard);
}

.confirm-overlay-enter-from .confirm-panel,
.confirm-overlay-leave-to .confirm-panel {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

.confirm-overlay-enter-to .confirm-panel,
.confirm-overlay-leave-from .confirm-panel {
  opacity: 1;
  transform: translateY(0) scale(1);
}
</style>
