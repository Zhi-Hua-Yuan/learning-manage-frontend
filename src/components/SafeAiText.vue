<template>
  <component :is="as" class="whitespace-pre-wrap break-words">{{ text }}</component>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    text?: string | null
    as?: 'span' | 'p' | 'div'
  }>(),
  {
    text: '',
    as: 'span',
  },
)
</script>
