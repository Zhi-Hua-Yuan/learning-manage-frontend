import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useToastStore } from '@/stores/toast'
import { resetProtectedSessionState } from '@/utils/sessionLifecycle'
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

  it('cancels pending commits and removes undo actions on session reset', async () => {
    const calls: string[] = []
    const undoDelete = useUndoDelete()

    undoDelete.scheduleUndoDelete({
      label: '任务',
      onCommit: async () => {
        calls.push('commit')
      },
      onRollback: async () => {
        calls.push('rollback')
      },
    })

    resetProtectedSessionState('AUTHENTICATION_REQUIRED')
    await vi.advanceTimersByTimeAsync(5000)

    expect(calls).toEqual([])
    expect(useToastStore().toasts).toEqual([])
  })

  it('suppresses success callbacks when the commit is in flight during session reset', async () => {
    let resolveCommit!: () => void
    const onCommitSuccess = vi.fn()
    const undoDelete = useUndoDelete()

    undoDelete.scheduleUndoDelete({
      label: '任务',
      onCommit: () => new Promise<void>((resolve) => {
        resolveCommit = resolve
      }),
      onRollback: vi.fn(),
      onCommitSuccess,
    })

    await vi.advanceTimersByTimeAsync(5000)
    expect(resolveCommit).toEqual(expect.any(Function))

    resetProtectedSessionState('USER_LOGOUT')
    resolveCommit()
    await vi.advanceTimersByTimeAsync(0)

    expect(onCommitSuccess).not.toHaveBeenCalled()
    expect(useToastStore().toasts).toEqual([])
  })

  it('suppresses rollback callbacks when the in-flight commit fails after reset', async () => {
    let rejectCommit!: (error: Error) => void
    const onRollback = vi.fn()
    const onCommitError = vi.fn()
    const undoDelete = useUndoDelete()

    undoDelete.scheduleUndoDelete({
      label: '任务',
      onCommit: () => new Promise<void>((_, reject) => {
        rejectCommit = reject
      }),
      onRollback,
      onCommitError,
    })

    await vi.advanceTimersByTimeAsync(5000)
    expect(rejectCommit).toEqual(expect.any(Function))

    resetProtectedSessionState('AUTHENTICATION_REQUIRED')
    rejectCommit(new Error('request failed'))
    await vi.advanceTimersByTimeAsync(0)

    expect(onRollback).not.toHaveBeenCalled()
    expect(onCommitError).not.toHaveBeenCalled()
    expect(useToastStore().toasts).toEqual([])
  })
})
