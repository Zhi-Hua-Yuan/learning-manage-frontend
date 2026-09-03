import { onScopeDispose } from 'vue'

import { useToast } from '@/composables/useToast'
import { registerSessionResetHandler } from '@/utils/sessionLifecycle'

export interface UndoDeleteOptions {
  label: string
  onCommit: () => Promise<void>
  onRollback: () => void | Promise<void>
  onCommitError?: (error: unknown) => string | void | Promise<string | void>
  onCommitSuccess?: () => void | Promise<void>
  pendingMessage?: string
  commitSuccessMessage?: string
  commitErrorMessage?: string
  undoSuccessMessage?: string
}

const UNDO_TIMEOUT = 5000

export const useUndoDelete = () => {
  const toast = useToast()
  const pendingDeletes = new Map<number, () => void>()

  const cancelAllPendingDeletes = () => {
    Array.from(pendingDeletes.values()).forEach((cancel) => cancel())
  }

  const unregisterSessionReset = registerSessionResetHandler(() => {
    cancelAllPendingDeletes()
  })
  onScopeDispose(unregisterSessionReset)

  const scheduleUndoDelete = (options: UndoDeleteOptions) => {
    let cancelled = false
    let sessionResetCancelled = false
    let commitStarted = false
    let undoStarted = false
    let toastId: number | null = null

    const finalize = () => {
      if (toastId !== null) pendingDeletes.delete(toastId)
    }

    const cancel = (reason: 'SESSION_RESET' | 'USER_UNDO') => {
      if (reason === 'SESSION_RESET') sessionResetCancelled = true
      if (cancelled) return
      cancelled = true
      clearTimeout(timer)
      if (toastId !== null) toast.dismiss(toastId)
      if (!commitStarted && !undoStarted) finalize()
    }

    const timer = setTimeout(async () => {
      if (cancelled) {
        finalize()
        return
      }
      commitStarted = true
      try {
        await options.onCommit()
        if (cancelled) return
        if (options.onCommitSuccess) {
          await options.onCommitSuccess()
        }
        if (cancelled) return
        toast.success(options.commitSuccessMessage || `${options.label}已删除。`)
      } catch (error) {
        if (cancelled) return
        console.error('删除提交失败', error)
        await options.onRollback()
        if (cancelled) return
        const recoveredMessage = options.onCommitError
          ? await options.onCommitError(error)
          : undefined
        if (cancelled) return
        toast.error(recoveredMessage || options.commitErrorMessage || '删除失败，请检查网络后重试。')
      } finally {
        finalize()
      }
    }, UNDO_TIMEOUT)

    toastId = toast.undo(
      options.pendingMessage || `${options.label}已移除，5 秒内可撤销。`,
      async () => {
        undoStarted = true
        cancel('USER_UNDO')
        try {
          await options.onRollback()
          if (sessionResetCancelled) return
          toast.success(options.undoSuccessMessage || '已撤销删除。')
        } finally {
          finalize()
        }
      },
      UNDO_TIMEOUT,
    )
    pendingDeletes.set(toastId, () => cancel('SESSION_RESET'))
  }

  return {
    scheduleUndoDelete,
    cancelAllPendingDeletes,
  }
}
