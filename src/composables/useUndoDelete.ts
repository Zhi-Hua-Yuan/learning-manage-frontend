import { useToast } from '@/composables/useToast'

export interface UndoDeleteOptions {
  label: string
  onCommit: () => Promise<void>
  onRollback: () => void | Promise<void>
  onCommitSuccess?: () => void | Promise<void>
  pendingMessage?: string
  commitSuccessMessage?: string
  commitErrorMessage?: string
  undoSuccessMessage?: string
}

const UNDO_TIMEOUT = 5000

export const useUndoDelete = () => {
  const toast = useToast()

  const scheduleUndoDelete = (options: UndoDeleteOptions) => {
    let cancelled = false

    const timer = setTimeout(async () => {
      if (cancelled) return
      try {
        await options.onCommit()
        if (options.onCommitSuccess) {
          await options.onCommitSuccess()
        }
        toast.success(options.commitSuccessMessage || `${options.label}已删除。`)
      } catch (error) {
        console.error('删除提交失败', error)
        await options.onRollback()
        toast.error(options.commitErrorMessage || '删除失败，请检查网络后重试。')
      }
    }, UNDO_TIMEOUT)

    toast.undo(
      options.pendingMessage || `${options.label}已移除，5 秒内可撤销。`,
      async () => {
        if (cancelled) return
        cancelled = true
        clearTimeout(timer)
        await options.onRollback()
        toast.success(options.undoSuccessMessage || '已撤销删除。')
      },
      UNDO_TIMEOUT,
    )
  }

  return {
    scheduleUndoDelete,
  }
}
