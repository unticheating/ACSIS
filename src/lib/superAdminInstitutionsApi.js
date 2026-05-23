import { apiFetch } from './apiFetch.js'

async function parseJson(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = typeof data.error === 'string' ? data.error : res.statusText
    throw new Error(message || 'Request failed')
  }
  return data
}

export async function fetchSuperAdminInstitutions() {
  const res = await apiFetch('/api/super-admin/institutions')
  const data = await parseJson(res)
  return data.institutions || []
}
