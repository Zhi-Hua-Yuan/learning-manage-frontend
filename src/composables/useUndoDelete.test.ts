import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useToastStore } from '@/stores/toast'
import { useUndoDelete } from './useUndoDelete'

describe('useUndoDelete commit recovery', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  it('rolls back before running the optional commit error recovery', async () => {
    const calls: string[] = []
    const error = new Error('permission changed')
    const undoDelete = useUndoDelete()

    undoDelete.scheduleUndoDelete({
      label: '任务',
      onCommit: async () => {
        calls.push('commit')
        throw error
      },
      onRollback: async () => {
        calls.push('rollback')
      },
      onCommitError: async (receivedError) => {
        expect(receivedError).toBe(error)
        calls.push('recover')
        return '权限已刷新。'
      },
    })

    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await vi.advanceTimersByTimeAsync(5000)

    expect(calls).toEqual(['commit', 'rollback', 'recover'])
    expect(useToastStore().toasts.some((toast) => toast.message === '权限已刷新。')).toBe(true)
  })
})
