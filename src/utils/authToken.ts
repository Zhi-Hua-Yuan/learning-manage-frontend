const AUTH_TOKEN_KEY = 'token'

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const isInvalidTokenValue = (value: string) => {
  const normalized = value.trim().toLowerCase()
  return normalized === '' || normalized === 'null' || normalized === 'undefined'
}

const resolveTokenFromObject = (value: unknown): string => {
  if (!value || typeof value !== 'object') return ''

  const record = value as Record<string, unknown>
  const directCandidates = [record.token, record.accessToken, record.jwt]
  for (const candidate of directCandidates) {
    if (typeof candidate === 'string' && !isInvalidTokenValue(candidate)) {
      return candidate.trim()
    }
  }

  if (record.data && typeof record.data === 'object') {
    const nested = record.data as Record<string, unknown>
    const nestedCandidates = [nested.token, nested.accessToken, nested.jwt]
    for (const candidate of nestedCandidates) {
      if (typeof candidate === 'string' && !isInvalidTokenValue(candidate)) {
        return candidate.trim()
      }
    }
  }

  return ''
}

const normalizeStoredToken = (raw: string | null): string => {
  if (!raw) return ''

  const trimmed = raw.trim()
  if (isInvalidTokenValue(trimmed)) return ''

  if (trimmed.toLowerCase().includes('<html')) {
    return ''
  }

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (typeof parsed === 'string') {
        const reparsed = parsed.trim()
        return isInvalidTokenValue(reparsed) ? '' : reparsed
      }
      const token = resolveTokenFromObject(parsed)
      if (token) return token
    } catch {
      // Fall through to raw value.
    }
  }

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      const token = resolveTokenFromObject(parsed)
      if (token) return token
      return ''
    } catch {
      return ''
    }
  }

  return trimmed
}

export const readAuthToken = () => {
  if (!canUseStorage()) return ''

  try {
    const raw = window.localStorage.getItem(AUTH_TOKEN_KEY)
    const normalized = normalizeStoredToken(raw)

    if (raw && !normalized) {
      window.localStorage.removeItem(AUTH_TOKEN_KEY)
    }

    return normalized
  } catch {
    return ''
  }
}

export const writeAuthToken = (token: string) => {
  if (!canUseStorage()) return

  try {
    const normalized = normalizeStoredToken(token)
    if (!normalized) {
      window.localStorage.removeItem(AUTH_TOKEN_KEY)
      return
    }

    window.localStorage.setItem(AUTH_TOKEN_KEY, normalized)
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
