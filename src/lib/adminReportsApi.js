import { apiFetch } from './apiFetch.js'

async function parseJson(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = typeof data.error === 'string' ? data.error : res.statusText
    throw new Error(message || 'Request failed')
  }
  return data
}

export async function fetchAdminReports() {
  const res = await apiFetch('/api/admin/reports')
  return parseJson(res)
}

export function reportTypeLabel(type) {
  const map = {
    class_results: 'Class results',
    individual: 'Individual',
    item_analysis: 'Item analysis',
  }
  return map[type] || type
}
