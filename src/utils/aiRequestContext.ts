interface AiListRequestContextOptions {
  isAggregateView: boolean
  currentListId: string | null | undefined
  requestListId: unknown
}

const normalizeContextListId = (value: unknown) => {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const normalized = String(value).trim()
  return normalized.length > 0 ? normalized : null
}

export const isAiListRequestContextActive = ({
  isAggregateView,
  currentListId,
  requestListId,
}: AiListRequestContextOptions) => {
  if (isAggregateView) return false
  const normalizedCurrentListId = normalizeContextListId(currentListId)
  const normalizedRequestListId = normalizeContextListId(requestListId)
  return normalizedCurrentListId !== null && normalizedCurrentListId === normalizedRequestListId
}
