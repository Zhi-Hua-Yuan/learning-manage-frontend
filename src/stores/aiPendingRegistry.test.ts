import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { AI_PENDING_BOARDS, useAiPendingRegistryStore } from './aiPendingRegistry'
import { resetProtectedSessionState } from '@/utils/sessionLifecycle'

describe('AI pending registry', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.setSystemTime(new Date('2026-08-21T00:00:00.000Z'))
  })

  it('allows one pending request per board', () => {
    const store = useAiPendingRegistryStore()
    const ticket = store.startRequest(AI_PENDING_BOARDS.AI_PLANNER_BREAKDOWN)

    expect(ticket).toEqual({ board: AI_PENDING_BOARDS.AI_PLANNER_BREAKDOWN, requestId: 1 })
    expect(store.startRequest(AI_PENDING_BOARDS.AI_PLANNER_BREAKDOWN)).toBeNull()
  })

  it('accepts success only for the active ticket', () => {
    const store = useAiPendingRegistryStore()
    const board = AI_PENDING_BOARDS.AI_PLANNER_BREAKDOWN
    const ticket = store.startRequest(board)!

    expect(store.resolveSuccess(ticket, { draftId: 'draft-1' })).toBe(true)
    expect(store.boards[board].status).toBe('success')
    expect(store.boards[board].responsePayload).toEqual({ draftId: 'draft-1' })
    expect(store.resolveSuccess({ ...ticket, requestId: 2 }, {})).toBe(false)
  })

  it('records errors for the active ticket', () => {
    const store = useAiPendingRegistryStore()
    const board = AI_PENDING_BOARDS.WEEKLY_REVIEW_POLISH
    const ticket = store.startRequest(board)!

    expect(store.resolveError(ticket, 'failed')).toBe(true)
    expect(store.boards[board]).toMatchObject({ status: 'error', errorMessage: 'failed' })
  })

  it('consumes success and toast tickets once', () => {
    const store = useAiPendingRegistryStore()
    const board = AI_PENDING_BOARDS.TASK_TODAY_AI_ORDER
    const ticket = store.startRequest(board)!
    store.resolveSuccess(ticket, {})

    expect(store.markConsumed(board, ticket.requestId)).toBe(true)
    expect(store.markConsumed(board, ticket.requestId)).toBe(false)
    expect(store.consumeToastTicket(board, ticket.requestId)).toBe(true)
    expect(store.consumeToastTicket(board, ticket.requestId)).toBe(false)
  })

  it('resets a board and all boards', () => {
    const store = useAiPendingRegistryStore()
    const first = store.startRequest(AI_PENDING_BOARDS.AI_PLANNER_BREAKDOWN)!
    store.resolveSuccess(first, {})
    store.startRequest(AI_PENDING_BOARDS.TASK_LIST_REPLAN_PREVIEW)

    store.resetAll()

    expect(Object.values(store.boards).every((entry) => entry.status === 'idle')).toBe(true)
    expect(store.boards[AI_PENDING_BOARDS.AI_PLANNER_BREAKDOWN].responsePayload).toBeNull()
  })

  it('resets all pending AI state when the protected session is reset', () => {
    const store = useAiPendingRegistryStore()
    const ticket = store.startRequest(AI_PENDING_BOARDS.WEEKLY_REVIEW_POLISH, {
      reviewKey: 'review:private-1',
    })!
    store.resolveSuccess(ticket, { reflection: 'sensitive response' })

    resetProtectedSessionState('USER_LOGOUT')

    expect(store.boards[AI_PENDING_BOARDS.WEEKLY_REVIEW_POLISH]).toMatchObject({
      status: 'idle',
      requestMeta: null,
      responsePayload: null,
      errorMessage: null,
    })
  })
})
