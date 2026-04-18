const AUTH_TOKEN_KEY = 'token'

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

export const readAuthToken = () => {
  if (!canUseStorage()) return ''
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export const writeAuthToken = (token: string) => {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token)
  } catch {
    // Ignore storage write errors.
  }
}

export const clearAuthToken = () => {
  if (!canUseStorage()) return
  try {
    window.localStorage.removeItem(AUTH_TOKEN_KEY)
  } catch {
    // Ignore storage remove errors.
  }
}
