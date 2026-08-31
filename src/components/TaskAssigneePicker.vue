<template>
  <div ref="rootRef" class="relative" data-testid="task-assignee-picker">
    <button
      ref="triggerRef"
      type="button"
      class="task-detail-select-trigger w-full"
      :disabled="disabled"
      :aria-haspopup="'listbox'"
      :aria-expanded="isOpen ? 'true' : 'false'"
      :aria-controls="menuId"
      :aria-label="triggerLabel"
      data-testid="task-assignee-picker-trigger"
      @click="toggleMenu"
      @keydown="onTriggerKeydown"
    >
      <span class="min-w-0 truncate text-left text-sm text-[var(--color-text-body)]">
        {{ selectedOption?.label || fallbackSelectedLabel }}
      </span>
      <svg class="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 9-7 7-7-7" />
      </svg>
    </button>

    <div
      v-if="isOpen"
      :id="menuId"
      ref="menuRef"
      role="listbox"
      tabindex="-1"
      class="surface-panel absolute left-0 top-full z-[var(--z-dropdown)] mt-2 max-h-64 w-full overflow-y-auto rounded-lg py-1"
      :aria-label="triggerLabel"
      :aria-activedescendant="activeOptionId"
      data-testid="task-assignee-picker-menu"
      @keydown="onMenuKeydown"
    >
      <div v-if="loading" class="px-3 py-3 text-sm text-[var(--color-text-secondary)]" role="status" data-testid="task-assignee-picker-loading">
        正在加载团队成员…
      </div>
      <div v-else-if="errorMessage" class="space-y-2 px-3 py-3 text-sm text-[var(--color-text-secondary)]" data-testid="task-assignee-picker-error">
        <p>{{ errorMessage }}</p>
        <button type="button" class="text-[var(--color-primary)]" data-testid="task-assignee-picker-retry" @click="emit('retry')">
          重新加载
        </button>
      </div>
      <div v-else-if="options.length === 0" class="px-3 py-3 text-sm text-[var(--color-text-secondary)]" data-testid="task-assignee-picker-empty">
        暂无可选负责人
      </div>
      <template v-else>
        <button
          v-for="(option, index) in options"
          :id="getOptionId(index)"
          :key="option.value ?? 'unassigned'"
          type="button"
          role="option"
          class="interactive-row flex w-full items-center gap-3 px-3 py-2 text-left"
          :class="[
            index === activeIndex ? 'bg-[var(--color-menu-hover)]' : '',
            option.disabled ? 'cursor-not-allowed opacity-50' : '',
          ]"
          :aria-selected="option.value === modelValue ? 'true' : 'false'"
          :aria-disabled="option.disabled ? 'true' : undefined"
          :disabled="option.disabled"
          @mouseenter="setActiveIndex(index)"
          @click="selectOption(option)"
        >
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm text-[var(--color-text-body)]">{{ option.label }}</span>
            <span v-if="option.description" class="block truncate text-xs text-[var(--color-text-tertiary)]">{{ option.description }}</span>
          </span>
          <svg
            v-if="option.value === modelValue"
            class="h-4 w-4 shrink-0 text-[var(--color-primary)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m5 12 4 4L19 7" />
          </svg>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { TaskAssigneeOption } from '@/utils/taskAssigneeOptions'

const props = withDefaults(defineProps<{
  modelValue: string | null
  options: readonly TaskAssigneeOption[]
  loading?: boolean
  disabled?: boolean
  errorMessage?: string | null
  triggerLabel?: string
}>(), {
  loading: false,
  disabled: false,
  errorMessage: null,
  triggerLabel: '选择负责人',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  open: []
  close: []
  retry: []
}>()

const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const activeIndex = ref(-1)
const instanceId = `task-assignee-picker-${Math.random().toString(36).slice(2)}`
const menuId = `${instanceId}-menu`

const selectedOption = computed(() => props.options.find((option) => option.value === props.modelValue))
const fallbackSelectedLabel = computed(() => props.modelValue ? `用户 #${props.modelValue}` : '未分配')
const activeOptionId = computed(() => activeIndex.value >= 0 ? getOptionId(activeIndex.value) : undefined)

const getOptionId = (index: number) => `${instanceId}-option-${index}`

const isSelectable = (index: number) => {
  const option = props.options[index]
  return Boolean(option && !option.disabled)
}

const findSelectableIndex = (startIndex: number, direction: 1 | -1) => {
  if (props.options.length === 0) return -1
  let index = startIndex
  for (let count = 0; count < props.options.length; count += 1) {
    index = (index + direction + props.options.length) % props.options.length
    if (isSelectable(index)) return index
  }
  return -1
}

const syncActiveIndex = () => {
  const selectedIndex = props.options.findIndex((option) => option.value === props.modelValue)
  if (selectedIndex >= 0 && isSelectable(selectedIndex)) {
    activeIndex.value = selectedIndex
    return
  }
  activeIndex.value = props.options.findIndex((_, index) => isSelectable(index))
}

const openMenu = async () => {
  if (props.disabled || isOpen.value) return
  isOpen.value = true
  syncActiveIndex()
  emit('open')
  await nextTick()
  menuRef.value?.focus()
}

const closeMenu = (restoreFocus = true) => {
  if (!isOpen.value) return
  isOpen.value = false
  emit('close')
  if (restoreFocus) triggerRef.value?.focus()
}

const toggleMenu = () => {
  if (isOpen.value) closeMenu()
  else void openMenu()
}

const setActiveIndex = (index: number) => {
  if (isSelectable(index)) activeIndex.value = index
}

const selectOption = (option: TaskAssigneeOption) => {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  closeMenu()
}

const onTriggerKeydown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    void openMenu()
  }
}

const onMenuKeydown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = findSelectableIndex(activeIndex.value, 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = findSelectableIndex(activeIndex.value < 0 ? 0 : activeIndex.value, -1)
  } else if (event.key === 'Home') {
    event.preventDefault()
    activeIndex.value = props.options.findIndex((_, index) => isSelectable(index))
  } else if (event.key === 'End') {
    event.preventDefault()
    for (let index = props.options.length - 1; index >= 0; index -= 1) {
      if (isSelectable(index)) {
        activeIndex.value = index
        break
      }
    }
  } else if (event.key === 'Enter' && activeIndex.value >= 0) {
    event.preventDefault()
    const option = props.options[activeIndex.value]
    if (option) selectOption(option)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    closeMenu()
  }
}

const onDocumentPointerdown = (event: PointerEvent) => {
  const target = event.target
  if (target instanceof Node && !rootRef.value?.contains(target)) closeMenu(false)
}

watch(() => props.options, () => {
  if (isOpen.value) syncActiveIndex()
}, { deep: true })

watch(() => props.disabled, (disabled) => {
  if (disabled) closeMenu(false)
})

document.addEventListener('pointerdown', onDocumentPointerdown)
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerdown))
</script>
