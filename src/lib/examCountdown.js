import { PG_EXAM_STATUS, normalizeExamStatus } from '@/lib/examFlowUi.js'

/**
 * Remaining exam time for faculty monitoring (and similar UIs).
 * @param {{ status?: string, duration?: number | null, openedAt?: string | null }} exam
 * @param {number} [nowMs]
 */
export function computeExamTimeDisplay(exam, nowMs = Date.now()) {
  const status = normalizeExamStatus(exam?.status)
  const durationMin = Number(exam?.duration)
  const hasLimit = Number.isFinite(durationMin) && durationMin > 0
  const limitSec = hasLimit ? durationMin * 60 : null

  if (status === PG_EXAM_STATUS.CLOSED) {
    return { seconds: 0, label: 'Ended', display: '00:00', isLow: false }
  }

  if (status === PG_EXAM_STATUS.WAITING) {
    return {
      seconds: limitSec,
      label: 'Duration',
      display: limitSec != null ? formatMmSs(limitSec) : '--:--',
      isLow: false,
    }
  }

  if (status !== PG_EXAM_STATUS.OPEN) {
    return {
      seconds: limitSec,
      label: 'Time',
      display: limitSec != null ? formatMmSs(limitSec) : '--:--',
      isLow: false,
    }
  }

  if (!hasLimit) {
    return { seconds: null, label: 'No limit', display: '--:--', isLow: false }
  }

  const openedMs = exam?.openedAt ? new Date(exam.openedAt).getTime() : NaN
  if (!Number.isFinite(openedMs)) {
    return {
      seconds: limitSec,
      label: 'Time left',
      display: formatMmSs(limitSec),
      isLow: false,
    }
  }

  const elapsedSec = Math.floor((nowMs - openedMs) / 1000)
  const remaining = Math.max(0, limitSec - elapsedSec)
  return {
    seconds: remaining,
    label: 'Time left',
    display: formatMmSs(remaining),
    isLow: remaining > 0 && remaining <= 300,
  }
}

export function formatMmSs(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}
