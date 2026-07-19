import { PG_EXAM_STATUS, normalizeExamStatus } from '@/lib/examFlowUi.js'

/**
 * Compute exam time display for either a student session (countdown) or a teacher (elapsed/duration).
 * @param {{ status?: string, duration?: number | null, openedAt?: string | null, sessionStartedAt?: string | null }} exam
 * @param {number} [nowMs]
 */
export function computeExamTimeDisplay(exam, nowMs = Date.now()) {
  const status = normalizeExamStatus(exam?.status)

  if (status === PG_EXAM_STATUS.CLOSED) {
    return { seconds: 0, label: 'Ended', display: '00:00:00', isLow: false }
  }

  if (status === PG_EXAM_STATUS.WAITING) {
    return {
      seconds: null,
      label: 'Duration',
      display: `${exam?.duration || 60}m`,
      isLow: false,
    }
  }

  if (exam?.sessionStartedAt) {
    // Student view: countdown based on session start + duration
    const endMs = new Date(exam.sessionStartedAt).getTime() + (exam.duration || 60) * 60000
    const remainingSec = Math.max(0, Math.floor((endMs - nowMs) / 1000))
    const display = formatHhMmSs(remainingSec)
    return {
      seconds: remainingSec,
      label: 'Time left',
      display,
      isLow: remainingSec > 0 && remainingSec <= 300,
    }
  }

  // Teacher view: elapsed time since opened
  if (exam?.openedAt && status === PG_EXAM_STATUS.OPEN) {
    const elapsedSec = Math.max(0, Math.floor((nowMs - new Date(exam.openedAt).getTime()) / 1000))
    return {
      seconds: elapsedSec,
      label: 'Elapsed',
      display: formatHhMmSs(elapsedSec),
      isLow: false,
    }
  }

  return {
    seconds: null,
    label: 'Duration',
    display: `${exam?.duration || 60}m`,
    isLow: false,
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
