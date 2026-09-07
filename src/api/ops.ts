import request from '@/utils/request'

export interface OpsSummary {
  from: string
  to: string
  totalCount: number
  statusCounts: Record<string, number>
  dimensionCounts: Record<string, number>
  p50DurationMs: number | null
  p95DurationMs: number | null
  totalTokens?: number
  estimatedCost?: number | null
  currency?: string | null
  queueCounts?: Record<string, number>
}

export interface DependencyStatus {
  name: string
  status: 'UP' | 'DEGRADED' | 'DOWN' | 'DISABLED' | 'UNKNOWN'
  detail: string
  checkedAt: string
}

export interface OpsOverview {
  from: string
  to: string
  ai: OpsSummary
  rag: OpsSummary
  agent: OpsSummary
  knowledgeQueue: Record<string, number>
  dependencies: Record<string, DependencyStatus>
}

export interface CleanupItem {
  resourceType: string
  cutoffTime: string
  status: string
  cursorId: number
  scannedCount: number
  estimatedCount: number
  redactedCount: number
  deletedCount: number
  errorSummary: string | null
}

export interface CleanupRun {
  runId: string
  clientRequestId: string
  triggerType: string
  policyVersion: string
  dryRun: boolean
  status: string
  scannedCount: number
  estimatedCount: number
  affectedCount: number
  failureCount: number
  errorSummary: string | null
  traceId: string
  startedAt: string | null
  finishedAt: string | null
  createTime: string
  idempotentReplay: boolean
  items: CleanupItem[]
}

export interface PageResult<T> {
  records: T[]
  current: number
  size: number
  total: number
}

export interface OpsFailure {
  source: string
  status: string
  failureType: string
  traceId: string | null
  occurredAt: string
}

export const fetchOpsOverviewApi = () => request.get<unknown, Promise<OpsOverview>>('/admin/ai/ops/overview')
export const fetchCleanupRunsApi = (current = 1, size = 20) =>
  request.get<unknown, Promise<PageResult<CleanupRun>>>('/admin/ai/ops/cleanup-runs', { params: { current, size } })
export const fetchCleanupRunApi = (runId: string) =>
  request.get<unknown, Promise<CleanupRun>>(`/admin/ai/ops/cleanup-runs/${encodeURIComponent(runId)}`)
export const submitCleanupApi = (dryRun: boolean, clientRequestId: string) =>
  request.post<unknown, Promise<CleanupRun>>('/admin/ai/ops/cleanup-runs', { dryRun, clientRequestId })
export const cancelCleanupApi = (runId: string) =>
  request.post(`/admin/ai/ops/cleanup-runs/${encodeURIComponent(runId)}/cancel`)
export const fetchOpsFailuresApi = () =>
  request.get<unknown, Promise<PageResult<OpsFailure>>>('/admin/ai/ops/failures', { params: { current: 1, size: 20 } })
