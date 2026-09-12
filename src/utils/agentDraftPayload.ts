import type { AgentScene } from '@/api/ai'

const NON_NEGATIVE_INTEGER_PATTERN = /^(0|[1-9]\d*)$/

export interface AgentDraftPayload {
  sourceRunId: string
  reportType: AgentScene
  sourceDataVersion: string
  riskLevel?: string | null
  managerSummary?: string | null
  publicSummary?: string | null
  recommendations?: string[]
}

export const normalizeSourceDataVersion = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const normalized = value.trim()
    return NON_NEGATIVE_INTEGER_PATTERN.test(normalized) ? normalized : null
  }

  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
    return String(value)
  }

  return null
}

export const parseAgentDraftPayload = (payloadJson: string): AgentDraftPayload | null => {
  let parsed: unknown
  try {
    parsed = JSON.parse(payloadJson)
  } catch {
    return null
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null

  const candidate = parsed as Record<string, unknown>
  const sourceRunId = typeof candidate.sourceRunId === 'string' ? candidate.sourceRunId.trim() : ''
  const reportType = candidate.reportType
  const sourceDataVersion = normalizeSourceDataVersion(candidate.sourceDataVersion)

  if (
    !sourceRunId
    || (reportType !== 'PROJECT_RISK' && reportType !== 'TEAM_WORKLOAD')
    || sourceDataVersion === null
  ) {
    return null
  }

  return {
    ...candidate,
    sourceRunId,
    reportType,
    sourceDataVersion,
  } as AgentDraftPayload
}
