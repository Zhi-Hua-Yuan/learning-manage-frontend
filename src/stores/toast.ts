import { ref } from 'vue'
import { defineStore } from 'pinia'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastAction {
  label: string
  onClick: () => void | Promise<void>
}

export interface ToastPayload {
  type?: ToastType
  message: string
  duration?: number
  action?: ToastAction
}

export interface ToastItem {
  id: number
  type: ToastType
  message: string
  duration: number
  action?: ToastAction
}

let toastSeed = 0

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<ToastItem[]>([])
  const timers = new Map<number, ReturnType<typeof setTimeout>>()

  const dismiss = (id: number) => {
    const timer = timers.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.delete(id)
    }
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  const push = (payload: ToastPayload) => {
    const id = ++toastSeed
    const duration = payload.duration ?? 3000
    const toast: ToastItem = {
      id,
      type: payload.type ?? 'success',
      message: payload.message,
      duration,
      action: payload.action,
    }
    toasts.value.push(toast)

    if (duration > 0) {
      const timer = setTimeout(() => {
        dismiss(id)
      }, duration)
      timers.set(id, timer)
    }

    return id
  }

  const triggerAction = async (id: number) => {
    const toast = toasts.value.find((item) => item.id === id)
    if (!toast?.action) return
    dismiss(id)
    try {
      await toast.action.onClick()
    } catch (error) {
      console.error('执行 Toast 操作失败', error)
    }
  }

  return {
    toasts,
    push,
    dismiss,
    triggerAction,
  }
})
