import { EventEmitter } from 'node:events'

const hub = new EventEmitter()
hub.setMaxListeners(200)

/**
 * @param {string | number} classId
 * @param {string | number} examId
 */
export function monitoringChannel(classId, examId) {
  return `monitoring:${classId}:${examId}`
}

/**
 * @param {string | number} classId
 * @param {string | number} examId
 */
export function notifyMonitoringUpdate(classId, examId) {
  hub.emit(monitoringChannel(classId, examId), { at: Date.now() })
}

/**
 * @param {string | number} classId
 * @param {string | number} examId
 * @param {(payload: { at: number }) => void} listener
 */
export function subscribeMonitoring(classId, examId, listener) {
  const channel = monitoringChannel(classId, examId)
  hub.on(channel, listener)
  return () => hub.off(channel, listener)
}
