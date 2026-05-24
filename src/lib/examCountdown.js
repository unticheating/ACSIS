import { PG_EXAM_STATUS, normalizeExamStatus } from '@/lib/examFlowUi.js'

/**
 * Remaining exam time for faculty monitoring (and similar UIs).
 * @param {{ status?: string, duration?: number | null, openedAt?: string | null }} exam
 * @param {number} [nowMs]
 */
export function computeExamTimeDisplay(exam, nowMs = Date.now()) {
  const status = normalizeExamStatus(exam?.status)
  const endMs = exam?.scheduledEnd ? new Date(exam.scheduledEnd).getTime() : null

  if (status === PG_EXAM_STATUS.CLOSED) {
    return { seconds: 0, label: 'Ended', display: '00:00:00', isLow: false }
  }

  if (!endMs || !Number.isFinite(endMs)) {
    return { seconds: null, label: 'No time limit', display: '--:--:--', isLow: false }
  }

  const remainingSec = Math.max(0, Math.floor((endMs - nowMs) / 1000))
  const display = formatHhMmSs(remainingSec)

  if (status === PG_EXAM_STATUS.WAITING) {
    return {
      seconds: remainingSec,
      label: 'Starts soon',
      display,
      isLow: false,
    }
  }

  if (status !== PG_EXAM_STATUS.OPEN) {
    return {
      seconds: remainingSec,
      label: 'Time',
      display,
      isLow: false,
    }
  }

  return {
    seconds: remainingSec,
    label: 'Time left',
    display,
    isLow: remainingSec > 0 && remainingSec <= 300,
  }
}

export function formatHhMmSs(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  
  const mStr = String(m).padStart(2, '0')
  const sStr = String(r).padStart(2, '0')
  
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${mStr}:${sStr}`
  }
  return `${mStr}:${sStr}`
}

export function formatMmSs(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}
