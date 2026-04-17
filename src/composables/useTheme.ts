import { readonly, ref } from 'vue'
import { readThemeModeCache, writeThemeModeCache } from '@/utils/appCache'
import { CACHE_REGISTRY } from '@/utils/cacheRegistry'

export type ThemeMode = 'light' | 'dark' | 'blue' | 'green' | 'brown' | 'pink'
export type ResolvedTheme = 'light' | 'dark' | 'blue' | 'green' | 'brown' | 'pink'

export const THEME_STORAGE_KEY = CACHE_REGISTRY.themeMode.key

const themeModeRef = ref<ThemeMode>('light')
const resolvedThemeRef = ref<ResolvedTheme>('light')

const isThemeMode = (value: string | null): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'blue' || value === 'green' || value === 'brown' || value === 'pink'

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined'

const readStoredThemeMode = (): { mode: ThemeMode; needsRepair: boolean } => {
  if (!isBrowser()) {
    return { mode: 'light', needsRepair: false }
  }

  try {
    const stored = readThemeModeCache()
    if (stored === null) {
      return { mode: 'light', needsRepair: false }
    }

    if (isThemeMode(stored)) {
      return { mode: stored, needsRepair: false }
    }
  } catch {
    return { mode: 'light', needsRepair: false }
  }

  return { mode: 'light', needsRepair: true }
}

const writeStoredThemeMode = (mode: ThemeMode) => {
  if (!isBrowser()) return

  try {
    writeThemeModeCache(mode)
  } catch {
    // Ignore storage write errors (private mode or restricted environment)
  }
}

const applyResolvedTheme = (theme: ResolvedTheme) => {
  if (!isBrowser()) return
  document.documentElement.dataset.theme = theme
}

const syncResolvedTheme = () => {
  resolvedThemeRef.value = themeModeRef.value
  applyResolvedTheme(themeModeRef.value)
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
}

export const useTheme = () => ({
  themeMode: readonly(themeModeRef),
  resolvedTheme: readonly(resolvedThemeRef),
  setThemeMode,
  initTheme,
})
