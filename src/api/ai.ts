import request from '../utils/request'
import type { EntityId, NumericLike, WirePage } from '../types/common'
import { normalizeEntityId, normalizeNumeric, normalizePage } from '../types/normalization'

export interface AiBreakdownTaskDraft {
  name: string
  priority: number
  dueDate: string
}

export interface AiBreakdownMilestoneDraft {
  name: string
  tasks: AiBreakdownTaskDraft[]
}

export interface AiBreakdownPreviewRequest {
  target: string
  description?: string
  duration: string
  detailed?: boolean
}

export interface AiBreakdownPreviewResponse {
  draftId: string
  expireAt: string
  milestones: AiBreakdownMilestoneDraft[]
}

export type AiDraftStatus = 0 | 1 | 2 | 3

export interface AiDraftDetailResponse {
  draftId: string
  scene: 'task-breakdown' | 'project-risk-report' | 'team-workload-report' | string
  status: AiDraftStatus
  statusText: string
  payloadJson: string
  expireAt: string
  confirmedAt: string | null
  canceledAt: string | null
}

export interface AiBreakdownDraftPayload {
  target: string
  description?: string
  duration: string
  detailed: boolean
  milestones: AiBreakdownMilestoneDraft[]
}

export interface AiBreakdownConfirmRequest {
  draftId: string
  operationId: string
  projectName?: string
  projectGoal?: string
}

interface AiDraftConfirmWireResponse {
  success: boolean
  idempotentReplay: boolean
  businessId: EntityId | null
}

export type AiDraftConfirmResponse =
  | { success: true; idempotentReplay: boolean; businessId: string }
  | { success: false; idempotentReplay: boolean; businessId: null }

export const normalizeAiDraftConfirmResponse = (
  wire: AiDraftConfirmWireResponse | null | undefined,
): AiDraftConfirmResponse => {
  if (!wire || typeof wire.success !== 'boolean' || typeof wire.idempotentReplay !== 'boolean') {
    throw new Error('确认接口响应结构不合法')
  }

  if (!wire.success) {
    return { success: false, idempotentReplay: wire.idempotentReplay, businessId: null }
  }

  const businessId = normalizeEntityId(wire.businessId)
  if (!businessId) throw new Error('确认接口返回了无效的业务 ID')
  return { success: true, idempotentReplay: wire.idempotentReplay, businessId }
}

export interface AiDraftCancelRequest {
  draftId: string
}

// AI 任务拆解预览（同步创建服务端草稿）
export const aiBreakdownPreviewApi = (
  data: AiBreakdownPreviewRequest,
): Promise<AiBreakdownPreviewResponse> => {
  return request.post('/ai/breakdown/preview', data) as Promise<AiBreakdownPreviewResponse>
}

// 获取 AI 草稿详情
export const getAiDraftDetailApi = (draftId: string): Promise<AiDraftDetailResponse> => {
  return request.get(`/ai/draft/${encodeURIComponent(draftId)}`) as Promise<AiDraftDetailResponse>
}

// 确认任务拆解草稿并创建项目
export const aiBreakdownConfirmApi = async (
  data: AiBreakdownConfirmRequest,
): Promise<AiDraftConfirmResponse> => {
  const wire = await request.post('/ai/breakdown/confirm', data) as AiDraftConfirmWireResponse
  return normalizeAiDraftConfirmResponse(wire)
}

// 取消 AI 草稿
export const cancelAiDraftApi = (data: AiDraftCancelRequest): Promise<boolean> => {
  return request.post('/ai/draft/cancel', data) as Promise<boolean>
}

export interface AiPolishRequest {
  taskIds: string[]
  reflection?: string
}

// AI 周总结润色
export const aiPolishApi = (data: AiPolishRequest): Promise<string> => {
  return request.post('/ai/polish', data) as Promise<string>
}

export interface AiTodayOrderRecommendRequest {
  taskIds?: Array<string | number>
  timezone?: string
  now?: string
  strategy?: 'balanced' | 'benefit_first' | 'quick_win'
  limit?: number
}

export interface AiTodayOrderItem {
  taskId: string | number
  rank?: number
  score?: number
  difficulty?: number
  cost?: number
  benefit?: number
  estimatedMinutes?: number
  reason?: string
}

export interface AiTodayOrderRecommendResponse {
  strategy?: 'balanced' | 'benefit_first' | 'quick_win'
  generatedAt?: string
  fallbackUsed?: boolean
  items?: AiTodayOrderItem[]
}

// AI 今日任务推荐顺序
export const aiTodayOrderRecommendApi = (data: AiTodayOrderRecommendRequest) => {
  return request.post('/ai/today-order/recommend', data)
}

export interface AiListReplanPreviewRequest {
  listId: string | number
}

export interface AiListReplanPreviewItem {
  taskId: string | number
  oldTitle?: string
  newTitle?: string
  oldPriority?: number
  newPriority?: number
  oldDueDate?: string | null
  newDueDate?: string | null
  confidence?: number
  reason?: string
}

export interface AiListReplanPreviewResponse {
  operationId: string
  changedCount?: number
  previewTasks?: AiListReplanPreviewItem[]
}

export interface AiListReplanConfirmRequest {
  listId: string | number
  operationId: string
}

export interface AiListReplanCancelRequest {
  operationId: string
}

// AI 清单任务智能重排预览（不落库）
export const aiListReplanPreviewApi = (
  data: AiListReplanPreviewRequest,
): Promise<AiListReplanPreviewResponse> => {
  return request.post('/ai/list/replan/preview', data) as Promise<AiListReplanPreviewResponse>
}

// AI 清单任务智能重排确认（落库）
export const aiListReplanConfirmApi = (data: AiListReplanConfirmRequest): Promise<boolean> => {
  return request.post('/ai/list/replan/confirm', data) as Promise<boolean>
}

// AI 清单任务智能重排取消（不落库）
export const aiListReplanCancelApi = (data: AiListReplanCancelRequest): Promise<boolean> => {
  return request.post('/ai/list/replan/cancel', data) as Promise<boolean>
}

export interface RagAskRequest {
  question: string
  projectId: string | number
}

export type RagResultStatus = 'ACTIVE' | 'STALE' | 'INVALIDATED' | 'EXPIRED'

export interface RagSource {
  citationId: string
  sourceType: 'TASK' | 'WEEKLY_REVIEW'
  sourceId: string | number
  title: string
  score: number
  vectorScore: number
  rerankScore: number | null
  updatedAt: string | null
}

export interface RagAnswerResponse {
  requestId: string
  status: RagResultStatus
  answer: string | null
  insufficientEvidence: boolean
  degraded: boolean
  degradationReason: string | null
  knowledgeAsOf: string | null
  sources: RagSource[]
}

export const ragAskApi = (data: RagAskRequest): Promise<RagAnswerResponse> => {
  return request.post('/ai/rag/ask', data) as Promise<RagAnswerResponse>
}

export const getRagResultApi = (requestId: string): Promise<RagAnswerResponse> => {
  return request.get(`/ai/rag/result/${encodeURIComponent(requestId)}`) as Promise<RagAnswerResponse>
}

export type AgentScene = 'PROJECT_RISK' | 'TEAM_WORKLOAD'
export type AgentRunStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'PARTIAL' | 'FAILED' | 'TIMED_OUT' | 'CANCELED'

export interface AgentRunCreatedResponse {
  runId: string
  status: AgentRunStatus
}

export interface AgentRunResponse {
  runId: string
  scene: AgentScene
  status: AgentRunStatus
  currentStep: string | null
  completedToolCount: number
  maxToolCount: number
  orchestrationMode: 'TOOL_CALLING' | 'FIXED_WORKFLOW'
  degraded: boolean
  partialReason: string | null
  failureType: string | null
  draftId: string | null
  submittedAt: string | null
  startedAt: string | null
  finishedAt: string | null
}

export interface AgentCancelResponse {
  runId: string
  status: AgentRunStatus
  cancelRequested: boolean
}

export interface AgentReportSource {
  citationId: string
  sourceType: 'TASK' | 'WEEKLY_REVIEW'
  sourceId: string
  title: string
}

export interface AnalysisReportResponse {
  reportId: string
  reportType: AgentScene
  projectId: string | null
  teamId: string | null
  status: 'ACTIVE' | 'STALE'
  summary: string | null
  memberMetrics: Record<string, unknown>
  recommendations: string[]
  sources: AgentReportSource[]
  generatedAt: string
}

export interface AnalysisReportPage {
  records: AnalysisReportResponse[]
  current: number
  size: number
  total: number
  pages: number
}

interface AgentReportSourceWire extends Omit<AgentReportSource, 'sourceId'> {
  sourceId: EntityId
}

interface AnalysisReportResponseWire extends Omit<AnalysisReportResponse, 'projectId' | 'teamId' | 'sources'> {
  projectId: EntityId | null
  teamId: EntityId | null
  sources: AgentReportSourceWire[]
}

interface AnalysisReportPageWire extends WirePage<AnalysisReportResponseWire> {
  pages?: NumericLike
}

const normalizeNullableReportId = (value: EntityId | null, fieldName: string): string | null => {
  if (value === null) return null
  const normalized = normalizeEntityId(value)
  if (!normalized) throw new Error(`报告接口返回了无效的${fieldName}`)
  return normalized
}

const normalizeAgentReportSource = (wire: AgentReportSourceWire): AgentReportSource => {
  const sourceId = normalizeEntityId(wire.sourceId)
  if (!sourceId) throw new Error('报告接口返回了无效的来源 ID')
  return { ...wire, sourceId }
}

export const normalizeAnalysisReportResponse = (
  wire: AnalysisReportResponseWire,
): AnalysisReportResponse => ({
  ...wire,
  projectId: normalizeNullableReportId(wire.projectId, '项目 ID'),
  teamId: normalizeNullableReportId(wire.teamId, '团队 ID'),
  sources: Array.isArray(wire.sources) ? wire.sources.map(normalizeAgentReportSource) : [],
})

export const normalizeAnalysisReportPage = (
  wire: AnalysisReportPageWire | null | undefined,
): AnalysisReportPage => {
  const page = normalizePage(wire)
  const fallbackPages = page.total === 0 ? 0 : Math.ceil(page.total / page.size)
  return {
    records: page.records.map(normalizeAnalysisReportResponse),
    current: page.current,
    size: page.size,
    total: page.total,
    pages: normalizeNumeric(wire?.pages, fallbackPages, 0),
  }
}

export const submitProjectRiskAgentApi = (projectId: string | number, clientRequestId: string) =>
  request.post('/ai/agent/project-risk', { projectId, clientRequestId }) as Promise<AgentRunCreatedResponse>

export const submitTeamWorkloadAgentApi = (teamId: string | number, clientRequestId: string) =>
  request.post('/ai/agent/team-workload', { teamId, clientRequestId }) as Promise<AgentRunCreatedResponse>

export const getAgentRunApi = (runId: string) =>
  request.get(`/ai/agent/run/${encodeURIComponent(runId)}`) as Promise<AgentRunResponse>

export const cancelAgentRunApi = (runId: string) =>
  request.post(`/ai/agent/run/${encodeURIComponent(runId)}/cancel`) as Promise<AgentCancelResponse>

export const confirmAgentReportApi = async (draftId: string, operationId: string): Promise<AiDraftConfirmResponse> => {
  const wire = await request.post('/ai/agent/report/confirm', { draftId, operationId }) as AiDraftConfirmWireResponse
  return normalizeAiDraftConfirmResponse(wire)
}

export const listAnalysisReportsApi = async (
  params: Record<string, string | number | undefined> = {},
): Promise<AnalysisReportPage> => {
  const wire = await request.get('/ai/report', { params }) as AnalysisReportPageWire
  return normalizeAnalysisReportPage(wire)
}

export const getAnalysisReportApi = async (reportId: string): Promise<AnalysisReportResponse> => {
  const wire = await request.get(`/ai/report/${encodeURIComponent(reportId)}`) as AnalysisReportResponseWire
  return normalizeAnalysisReportResponse(wire)
}

export const deleteAnalysisReportApi = (reportId: string) =>
  request.post(`/ai/report/${encodeURIComponent(reportId)}/delete`) as Promise<boolean>
