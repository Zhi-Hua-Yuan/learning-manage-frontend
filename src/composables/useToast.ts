import { useToastStore, type ToastType } from '@/stores/toast'

export const useToast = () => {
  const toastStore = useToastStore()

  const show = (message: string, type: ToastType = 'success', duration = 3000) =>
    toastStore.push({ message, type, duration })

  const success = (message: string, duration = 3000) => show(message, 'success', duration)
  const error = (message: string, duration = 3000) => show(message, 'error', duration)
  const info = (message: string, duration = 3000) => show(message, 'info', duration)
  const warning = (message: string, duration = 3000) => show(message, 'warning', duration)

  const undo = (message: string, onUndo: () => void | Promise<void>, duration = 5000) =>
    toastStore.push({
      type: 'info',
      message,
      duration,
      action: {
        label: '撤销',
        onClick: onUndo,
      },
    })

  return {
    show,
    success,
    error,
    info,
    warning,
    undo,
  }
}
