import { apiFetch } from './apiFetch.js'

export async function fetchStudentPerformance() {
  const res = await apiFetch('/api/student/performance')
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Failed to load performance.')
  }
  return data
}
