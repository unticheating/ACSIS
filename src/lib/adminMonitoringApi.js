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

export async function fetchAdminMonitoring() {
  const res = await apiFetch('/api/admin/monitoring')
  return parseJson(res)
}

export { formatRelativeTime }
