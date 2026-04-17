import { reactive } from 'vue'
import { defineStore } from 'pinia'

export const AI_PENDING_BOARDS = {
  WEEKLY_REVIEW_POLISH: 'weekly-review-polish',
  AI_PLANNER_BREAKDOWN: 'ai-planner-breakdown',
} as const

export type AiPendingBoard = (typeof AI_PENDING_BOARDS)[keyof typeof AI_PENDING_BOARDS]
export type AiPendingStatus = 'idle' | 'pending' | 'success' | 'error' | 'consumed'

export interface AiPendingTicket {
  board: AiPendingBoard
  requestId: number
}

export interface AiPendingEntry {
  status: AiPendingStatus
  requestId: number
  requestMeta: Record<string, unknown> | null
  responsePayload: unknown
  errorMessage: string | null
  updatedAt: number
  consumedAt: number | null
  lastToastedRequestId: number
}

const createBoardEntry = (): AiPendingEntry => ({
  status: 'idle',
  requestId: 0,
  requestMeta: null,
  responsePayload: null,
  errorMessage: null,
  updatedAt: 0,
  consumedAt: null,
  lastToastedRequestId: 0,
})

const now = () => Date.now()

export const useAiPendingRegistryStore = defineStore('aiPendingRegistry', () => {
  const boards = reactive<Record<AiPendingBoard, AiPendingEntry>>({
    [AI_PENDING_BOARDS.WEEKLY_REVIEW_POLISH]: createBoardEntry(),
    [AI_PENDING_BOARDS.AI_PLANNER_BREAKDOWN]: createBoardEntry(),
  })

  const startRequest = (
    board: AiPendingBoard,
    requestMeta: Record<string, unknown> | null = null,
  ): AiPendingTicket | null => {
    const entry = boards[board]
    if (entry.status === 'pending') return null

    const requestId = entry.requestId + 1
    entry.status = 'pending'
    entry.requestId = requestId
    entry.requestMeta = requestMeta
    entry.responsePayload = null
    entry.errorMessage = null
    entry.consumedAt = null
    entry.updatedAt = now()

    return { board, requestId }
  }

  const resolveSuccess = (ticket: AiPendingTicket, payload: unknown) => {
    const entry = boards[ticket.board]
    if (entry.requestId !== ticket.requestId || entry.status !== 'pending') return false

    entry.status = 'success'
    entry.responsePayload = payload
    entry.errorMessage = null
    entry.consumedAt = null
    entry.updatedAt = now()
    return true
  }

  const resolveError = (ticket: AiPendingTicket, message: string) => {
    const entry = boards[ticket.board]
    if (entry.requestId !== ticket.requestId || entry.status !== 'pending') return false

    entry.status = 'error'
    entry.responsePayload = null
    entry.errorMessage = message
    entry.consumedAt = null
    entry.updatedAt = now()
    return true
  }

  const markConsumed = (board: AiPendingBoard, requestId?: number) => {
    const entry = boards[board]
    if (entry.status !== 'success') return false
    if (typeof requestId === 'number' && entry.requestId !== requestId) return false

    entry.status = 'consumed'
    entry.consumedAt = now()
    entry.updatedAt = entry.consumedAt
    return true
  }

  const consumeToastTicket = (board: AiPendingBoard, requestId: number) => {
    const entry = boards[board]
    if (requestId <= entry.lastToastedRequestId) return false
    entry.lastToastedRequestId = requestId
    return true
  }

  const resetBoard = (board: AiPendingBoard) => {
    const entry = boards[board]
    entry.status = 'idle'
    entry.requestMeta = null
    entry.responsePayload = null
    entry.errorMessage = null
    entry.consumedAt = null
    entry.updatedAt = now()
  }

  const resetAll = () => {
    ;(Object.keys(boards) as AiPendingBoard[]).forEach((board) => {
      resetBoard(board)
    })
  }

  return {
    boards,
    startRequest,
    resolveSuccess,
    resolveError,
    markConsumed,
    consumeToastTicket,
    resetBoard,
    resetAll,
  }
})
