import { acsisToastError, acsisToastSuccess } from '@/lib/acsisToast.js'

export async function copyToClipboard(text, { successMessage = 'Copied to clipboard.' } = {}) {
  const value = String(text ?? '').trim()
  if (!value) {
    acsisToastError('Nothing to copy.')
    return false
  }
  try {
    await navigator.clipboard.writeText(value)
    acsisToastSuccess(successMessage)
    return true
  } catch {
    acsisToastError('Could not copy automatically. Please copy manually.')
    return false
  }
}
