import { apiFetch } from './apiFetch.js'
import { formatRelativeTime } from './adminDashboardApi.js'

async function parseJson(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = typeof data.error === 'string' ? data.error : res.statusText
    throw new Error(message || 'Request failed')
  }
  return data
}

/**
 * @param {{ activityLimit?: number }} [options]
 */
export async function fetchAdminMonitoring(options = {}) {
  const params = new URLSearchParams()
  if (options.activityLimit != null) {
    params.set('activityLimit', String(options.activityLimit))
  }
  const qs = params.toString()
  const res = await apiFetch(`/api/admin/monitoring${qs ? `?${qs}` : ''}`)
  return parseJson(res)
}

export { formatRelativeTime }
