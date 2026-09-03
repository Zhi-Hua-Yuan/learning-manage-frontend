let activeActorId: string | null = null

export const normalizeCacheActorId = (value: unknown): string | null => {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const normalized = String(value).trim()
  return normalized ? normalized : null
}

export const setActiveCacheActor = (actorId: unknown) => {
  activeActorId = normalizeCacheActorId(actorId)
}

export const clearActiveCacheActor = () => {
  activeActorId = null
}

export const getActiveCacheActor = () => activeActorId

export const scopeCacheKey = (baseKey: string, actorId: unknown = activeActorId): string | null => {
  const normalized = normalizeCacheActorId(actorId)
  if (!normalized) return null
  return `${baseKey}:actor-${encodeURIComponent(normalized)}`
}
