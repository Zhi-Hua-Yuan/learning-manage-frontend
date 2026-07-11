import { useToast } from '@/composables/useToast'
import {
  useAiPendingRegistryStore,
  type AiPendingBoard,
  type AiPendingTicket,
} from '@/stores/aiPendingRegistry'

type RequestRunStatus = 'success' | 'error' | 'blocked' | 'stale'

interface RunAiRequestOptions<T> {
  board: AiPendingBoard
  requestMeta?: Record<string, unknown> | null
  request: () => Promise<T>
  successMessage: string
  errorMessage: string | ((error: unknown) => string)
  onStart?: () => void
}

interface RequestRunResult<T> {
  status: RequestRunStatus
  ticket: AiPendingTicket | null
  payload?: T
  error?: unknown
  errorMessage?: string
}

const resolveErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message || '')
    if (message) return message
  }
  return '请求失败'
}

export const useAiPendingRequest = () => {
  const toast = useToast()
  const registry = useAiPendingRegistryStore()

  const runAiRequest = async <T>(options: RunAiRequestOptions<T>): Promise<RequestRunResult<T>> => {
    const ticket = registry.startRequest(options.board, options.requestMeta || null)
    if (!ticket) {
      return { status: 'blocked', ticket: null }
    }

    options.onStart?.()

    try {
      const payload = await options.request()
      const accepted = registry.resolveSuccess(ticket, payload)

      if (accepted && registry.consumeToastTicket(options.board, ticket.requestId)) {
        toast.success(options.successMessage)
      }

      return {
        status: accepted ? 'success' : 'stale',
        ticket,
        payload,
      }
    } catch (error) {
      const message = resolveErrorMessage(error)
      const accepted = registry.resolveError(ticket, message)

      if (accepted && registry.consumeToastTicket(options.board, ticket.requestId)) {
        const toastMessage =
          typeof options.errorMessage === 'function'
            ? options.errorMessage(error)
            : options.errorMessage
        toast.error(toastMessage)
      }

      return {
        status: accepted ? 'error' : 'stale',
        ticket,
        error,
        errorMessage: message,
      }
    }
  }

  return {
    runAiRequest,
  }
}
