import { toast } from 'sonner'

/** Error / validation — matches immersive login alert (red) */
export function acsisToastError(message, options) {
  if (!message) return
  toast.error(String(message), { duration: 8000, ...options })
}

/** Neutral message */
export function acsisToast(message) {
  if (!message) return
  toast(String(message))
}

/** Success — green immersive style */
export function acsisToastSuccess(message) {
  if (!message) return
  toast.success(String(message))
}
