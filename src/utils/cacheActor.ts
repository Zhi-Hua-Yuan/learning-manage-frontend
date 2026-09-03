let activeActorId: string | null = null

const normalizeActorId = (value: unknown): string | null => {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const normalized = String(value).trim()
  return normalized ? normalized : null
}

export const setActiveCacheActor = (actorId: unknown) => {
  activeActorId = normalizeActorId(actorId)
}

export const clearActiveCacheActor = () => {
  activeActorId = null
}

export const getActiveCacheActor = () => activeActorId

export const scopeCacheKey = (baseKey: string, actorId: unknown = activeActorId): string | null => {
  const normalized = normalizeActorId(actorId)
  if (!normalized) return null
  return `${baseKey}:actor-${encodeURIComponent(normalized)}`
}
