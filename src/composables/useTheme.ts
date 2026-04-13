import { readonly, ref } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'tick_themeMode'

const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)'

const themeModeRef = ref<ThemeMode>('system')
const resolvedThemeRef = ref<ResolvedTheme>('light')

let mediaQueryList: MediaQueryList | null = null
let hasBoundSystemListener = false

const isThemeMode = (value: string | null): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'system'

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined'

const readStoredThemeMode = (): { mode: ThemeMode; needsRepair: boolean } => {
  if (!isBrowser()) {
    return { mode: 'system', needsRepair: false }
  }

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === null) {
      return { mode: 'system', needsRepair: false }
    }

    if (isThemeMode(stored)) {
      return { mode: stored, needsRepair: false }
    }
  } catch {
    return { mode: 'system', needsRepair: false }
  }

  return { mode: 'system', needsRepair: true }
}

const writeStoredThemeMode = (mode: ThemeMode) => {
  if (!isBrowser()) return

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch {
    // Ignore storage write errors (private mode or restricted environment)
  }
}

const getSystemResolvedTheme = (): ResolvedTheme => {
  if (!isBrowser() || typeof window.matchMedia !== 'function') {
    return 'light'
  }

  return window.matchMedia(SYSTEM_THEME_QUERY).matches ? 'dark' : 'light'
}

const resolveTheme = (mode: ThemeMode): ResolvedTheme => {
  if (mode === 'system') {
    return getSystemResolvedTheme()
  }

  return mode
}

const applyResolvedTheme = (theme: ResolvedTheme) => {
  if (!isBrowser()) return
  document.documentElement.dataset.theme = theme
}

const syncResolvedTheme = () => {
  const nextResolvedTheme = resolveTheme(themeModeRef.value)
  resolvedThemeRef.value = nextResolvedTheme
  applyResolvedTheme(nextResolvedTheme)
}

const handleSystemThemeChange = (event: MediaQueryListEvent) => {
  if (themeModeRef.value !== 'system') {
    return
  }

  const nextResolvedTheme: ResolvedTheme = event.matches ? 'dark' : 'light'
  resolvedThemeRef.value = nextResolvedTheme
  applyResolvedTheme(nextResolvedTheme)
}

const ensureSystemThemeListener = () => {
  if (!isBrowser() || hasBoundSystemListener || typeof window.matchMedia !== 'function') {
    return
  }

  mediaQueryList = window.matchMedia(SYSTEM_THEME_QUERY)

  if (typeof mediaQueryList.addEventListener === 'function') {
    mediaQueryList.addEventListener('change', handleSystemThemeChange)
  } else {
    mediaQueryList.addListener(handleSystemThemeChange)
  }

  hasBoundSystemListener = true
}

const setThemeMode = (mode: ThemeMode) => {
  themeModeRef.value = mode
  writeStoredThemeMode(mode)
  syncResolvedTheme()
}

const initTheme = () => {
  const { mode, needsRepair } = readStoredThemeMode()
  themeModeRef.value = mode

  if (needsRepair) {
    writeStoredThemeMode(mode)
  }

  syncResolvedTheme()
  ensureSystemThemeListener()
}

export const useTheme = () => ({
  themeMode: readonly(themeModeRef),
  resolvedTheme: readonly(resolvedThemeRef),
  setThemeMode,
  initTheme,
})