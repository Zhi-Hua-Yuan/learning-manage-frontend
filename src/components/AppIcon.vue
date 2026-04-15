<template>
  <svg
    class="inline-block h-5 w-5 shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    :stroke-width="strokeWidth"
    aria-hidden="true"
  >
    <template v-if="name === 'dashboard'">
      <path d="M4 19.5h16" />
      <path d="M6 17V10" />
      <path d="M12 17V6" />
      <path d="M18 17v-5" />
    </template>

    <template v-else-if="name === 'calendar'">
      <path d="M8 3v3" />
      <path d="M16 3v3" />
      <path d="M3 10h18" />
      <rect x="3" y="5" width="18" height="16" rx="2" ry="2" />
    </template>

    <template v-else-if="name === 'sparkles'">
      <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" />
      <path d="M19 4v2" />
      <path d="M20 5h-2" />
      <path d="M5 17v2" />
      <path d="M6 18H4" />
    </template>

    <template v-else-if="name === 'folder'">
      <path d="M3 8a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" />
    </template>

    <template v-else-if="name === 'settings'">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 1 1.5h.1a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.5 1z"
      />
    </template>

    <template v-else-if="name === 'logout'">
      <path d="M15 17l5-5-5-5" />
      <path d="M20 12H9" />
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    </template>

    <template v-else-if="name === 'trash'">
      <path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
      <path d="M4 7h16" />
    </template>

    <template v-else-if="name === 'warning'">
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    </template>

    <template v-else-if="name === 'success'">
      <path d="M20 6 9 17l-5-5" />
    </template>

    <template v-else-if="name === 'info'">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8h.01" />
      <path d="M11 12h1v4h1" />
    </template>

    <template v-else-if="name === 'trophy'">
      <path d="M8 4h8v4a4 4 0 0 1-8 0V4z" />
      <path d="M6 6H4a2 2 0 0 0 0 4h2" />
      <path d="M18 6h2a2 2 0 0 1 0 4h-2" />
      <path d="M12 12v5" />
      <path d="M9 21h6" />
    </template>

    <template v-else-if="name === 'flag'">
      <path d="M5 21V4" />
      <path d="M5 5h11l-1.5 3L16 11H5" />
    </template>

    <template v-else-if="name === 'target'">
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
    </template>

    <template v-else-if="name === 'document'">
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </template>

    <template v-else-if="name === 'brain'">
      <path d="M8 14a5 5 0 1 1 8 0c-1 1-1.5 2-1.5 3.5h-5C9.5 16 9 15 8 14z" />
      <path d="M9 18h6" />
      <path d="M10 21h4" />
    </template>

    <template v-else-if="name === 'history'">
      <path d="M3 4v4h4" />
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M12 7v6l4 2" />
    </template>

    <template v-else-if="name === 'save'">
      <path d="M5 4h12l2 2v14H5V4z" />
      <path d="M8 4v6h8V4" />
      <path d="M9 20v-6h6v6" />
    </template>

    <template v-else-if="name === 'lock'">
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
      <rect x="6" y="11" width="12" height="10" rx="1" ry="1" />
      <path d="M12 15v2" />
    </template>

    <template v-else-if="name === 'clipboard'">
      <path d="M9 3h6v2h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h3V3z" />
      <path d="M9 8h6" />
    </template>

    <template v-else>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8h.01" />
      <path d="M11 12h1v4h1" />
    </template>
  </svg>
</template>

<script setup lang="ts">
export type IconName =
  | 'dashboard'
  | 'calendar'
  | 'sparkles'
  | 'folder'
  | 'settings'
  | 'logout'
  | 'trash'
  | 'warning'
  | 'success'
  | 'info'
  | 'trophy'
  | 'flag'
  | 'target'
  | 'document'
  | 'brain'
  | 'history'
  | 'save'
  | 'lock'
  | 'clipboard'

withDefaults(
  defineProps<{
    name: IconName
    strokeWidth?: number
  }>(),
  {
    strokeWidth: 2,
  },
)
</script>
