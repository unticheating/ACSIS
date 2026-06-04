import { normalizeInstitutionEmailDomain } from './institutionEmailDomain.js'

const MAX_LOGO_LENGTH = 900_000
const NAME_MAX = 100
const ACRONYM_MAX = 20
const WARNINGS_MIN = 1
const WARNINGS_MAX = 20

/**
 * @param {unknown} logo
 */
export function normalizeLogo(logo) {
  if (logo === null || logo === '') return { ok: true, value: null }
  if (typeof logo !== 'string') {
    return { ok: false, error: 'Invalid logo.' }
  }
  const trimmed = logo.trim()
  if (!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(trimmed)) {
    return { ok: false, error: 'Logo must be a PNG, JPEG, or WebP image.' }
  }
  if (trimmed.length > MAX_LOGO_LENGTH) {
    return { ok: false, error: 'Logo is too large. Use an image under 500 KB.' }
  }
  return { ok: true, value: trimmed }
}

/**
 * @param {import('pg').Pool} pool
 * @param {number} institutionId
 * @param {Record<string, unknown>} body
 */
export async function updateInstitutionSettings(pool, institutionId, body) {
  const updates = []
  const params = []
  let paramIdx = 1

  if (body.institutionName !== undefined) {
    const name = typeof body.institutionName === 'string' ? body.institutionName.trim() : ''
    if (name.length < 2 || name.length > NAME_MAX) {
      return { ok: false, status: 400, error: `Institution name must be 2–${NAME_MAX} characters.` }
    }
    updates.push(`institution_name = $${paramIdx++}`)
    params.push(name)
  }

  if (body.acronym !== undefined) {
    const acronym = typeof body.acronym === 'string' ? body.acronym.trim().toUpperCase() : ''
    if (!/^[A-Z0-9][A-Z0-9-]{0,19}$/.test(acronym)) {
      return {
        ok: false,
        status: 400,
        error: 'Acronym must be 1–20 letters, numbers, or hyphens (no spaces).',
      }
    }
    const clash = await pool.query(
      `SELECT institution_id FROM institutions
       WHERE LOWER(acronym) = LOWER($1) AND institution_id != $2`,
      [acronym, institutionId],
    )
    if (clash.rows[0]) {
      return { ok: false, status: 409, error: 'That acronym is already used by another institution.' }
    }
    updates.push(`acronym = $${paramIdx++}`)
    params.push(acronym)
  }

  if (body.maxWarnings !== undefined) {
    const maxWarnings = Number(body.maxWarnings)
    if (!Number.isInteger(maxWarnings) || maxWarnings < WARNINGS_MIN || maxWarnings > WARNINGS_MAX) {
      return {
        ok: false,
        status: 400,
        error: `Max warnings must be between ${WARNINGS_MIN} and ${WARNINGS_MAX}.`,
      }
    }
    updates.push(`max_warnings = $${paramIdx++}`)
    params.push(maxWarnings)
  }

  if (body.logo !== undefined) {
    const logoResult = normalizeLogo(body.logo)
    if (!logoResult.ok) {
      return { ok: false, status: 400, error: logoResult.error }
    }
    updates.push(`logo = $${paramIdx++}`)
    params.push(logoResult.value)
  }

  if (body.emailDomain !== undefined) {
    const domainResult = normalizeInstitutionEmailDomain(body.emailDomain)
    if (!domainResult.ok) {
      return { ok: false, status: 400, error: domainResult.error }
    }
    updates.push(`email_domain = $${paramIdx++}`)
    params.push(domainResult.value)
  }

  if (updates.length === 0) {
    return { ok: false, status: 400, error: 'No settings to update.' }
  }

  updates.push('updated_at = NOW()')
  params.push(institutionId)

  const sql = `UPDATE institutions SET ${updates.join(', ')}
     WHERE institution_id = $${paramIdx} AND is_active = TRUE
     RETURNING institution_id`

  const updated = await pool.query(sql, params)
  if (!updated.rows[0]) {
    return { ok: false, status: 404, error: 'Institution not found.' }
  }
  return { ok: true }
}
