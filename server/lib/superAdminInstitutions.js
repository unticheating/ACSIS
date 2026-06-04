/**
 * Platform-wide institution listing for super administrators.
 */

import { normalizeInstitutionEmailDomain } from './institutionEmailDomain.js'
import { normalizeLogo } from './institutionSettings.js'
import { createInstitutionUser } from './institutionUsers.js'

const NAME_MAX = 100
const WARNINGS_MIN = 1
const WARNINGS_MAX = 20

const INSTITUTION_SELECT = `SELECT i.institution_id, i.institution_name, i.acronym, i.logo, i.email_domain, i.is_active,
            t.theme_id, t.theme_name, t.primary_color, t.secondary_color, t.base_color
     FROM institutions i
     JOIN themes t ON t.theme_id = i.theme_id`

/** @param {Record<string, unknown>} r */
function mapInstitutionRow(r) {
  return {
    institutionId: r.institution_id,
    institutionName: r.institution_name,
    acronym: r.acronym,
    logo: r.logo || null,
    emailDomain: r.email_domain || null,
    isActive: r.is_active,
    theme: {
      themeId: r.theme_id,
      themeName: r.theme_name,
      primaryColor: r.primary_color,
      secondaryColor: r.secondary_color,
      baseColor: r.base_color,
    },
  }
}

/**
 * @param {import('pg').Pool} pool
 */
export async function listInstitutionsForSuperAdmin(pool) {
  const { rows } = await pool.query(
    `${INSTITUTION_SELECT}
     ORDER BY i.institution_name ASC, i.institution_id ASC`,
  )
  return rows.map(mapInstitutionRow)
}

/**
 * @param {import('pg').Pool} pool
 * @param {number} createdByUid
 * @param {Record<string, unknown>} body
 */
export async function createInstitutionForSuperAdmin(pool, createdByUid, body) {
  const name = typeof body.institutionName === 'string' ? body.institutionName.trim() : ''
  if (name.length < 2 || name.length > NAME_MAX) {
    return {
      ok: false,
      status: 400,
      error: `Institution name must be 2–${NAME_MAX} characters.`,
    }
  }

  const acronym = typeof body.acronym === 'string' ? body.acronym.trim().toUpperCase() : ''
  if (!/^[A-Z0-9][A-Z0-9-]{0,19}$/.test(acronym)) {
    return {
      ok: false,
      status: 400,
      error: 'Acronym must be 1–20 letters, numbers, or hyphens (no spaces).',
    }
  }

  const clash = await pool.query(
    `SELECT institution_id FROM institutions WHERE LOWER(acronym) = LOWER($1)`,
    [acronym],
  )
  if (clash.rows[0]) {
    return { ok: false, status: 409, error: 'That acronym is already in use.' }
  }

  let logoValue = null
  if (body.logo !== undefined && body.logo !== null && body.logo !== '') {
    const logoResult = normalizeLogo(body.logo)
    if (!logoResult.ok) {
      return { ok: false, status: 400, error: logoResult.error }
    }
    logoValue = logoResult.value
  }

  const themeId = Number(body.themeId)
  if (!Number.isInteger(themeId) || themeId < 1) {
    return { ok: false, status: 400, error: 'Please select a color theme.' }
  }
  const themeCheck = await pool.query(`SELECT theme_id FROM themes WHERE theme_id = $1`, [themeId])
  if (!themeCheck.rows[0]) {
    return { ok: false, status: 400, error: 'Unknown theme.' }
  }

  const maxWarnings =
    body.maxWarnings !== undefined && body.maxWarnings !== null && body.maxWarnings !== ''
      ? Number(body.maxWarnings)
      : 3
  if (!Number.isInteger(maxWarnings) || maxWarnings < WARNINGS_MIN || maxWarnings > WARNINGS_MAX) {
    return {
      ok: false,
      status: 400,
      error: `Max warnings must be between ${WARNINGS_MIN} and ${WARNINGS_MAX}.`,
    }
  }

  if (!Number.isInteger(createdByUid) || createdByUid < 1) {
    return { ok: false, status: 401, error: 'Not authenticated.' }
  }

  let emailDomainValue = null
  if (body.emailDomain !== undefined && body.emailDomain !== null && body.emailDomain !== '') {
    const domainResult = normalizeInstitutionEmailDomain(body.emailDomain)
    if (!domainResult.ok) {
      return { ok: false, status: 400, error: domainResult.error }
    }
    emailDomainValue = domainResult.value
  }

  const insert = await pool.query(
    `INSERT INTO institutions (
       institution_name, acronym, logo, theme_id, max_warnings, email_domain, is_active, created_by
     ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)
     RETURNING institution_id`,
    [name, acronym, logoValue, themeId, maxWarnings, emailDomainValue, createdByUid],
  )

  const institutionId = insert.rows[0]?.institution_id
  if (!institutionId) {
    return { ok: false, status: 500, error: 'Failed to create institution.' }
  }

  const { rows } = await pool.query(`${INSTITUTION_SELECT} WHERE i.institution_id = $1`, [institutionId])
  if (!rows[0]) {
    return { ok: false, status: 500, error: 'Institution created but could not be loaded.' }
  }

  let bootstrapAdmin = null
  const adminBody = body.admin
  if (adminBody && typeof adminBody === 'object') {
    const adminResult = await createInstitutionUser(pool, institutionId, {
      firstName: adminBody.firstName,
      lastName: adminBody.lastName,
      middleName: adminBody.middleName,
      email: adminBody.email,
      password: adminBody.password,
      schoolId: adminBody.schoolId,
      role: 'admin',
    })
    if (!adminResult.ok) {
      return {
        ok: false,
        status: adminResult.status || 400,
        error: `Institution created, but admin setup failed: ${adminResult.error}`,
        institution: mapInstitutionRow(rows[0]),
      }
    }
    bootstrapAdmin = adminResult.user
  }

  return { ok: true, institution: mapInstitutionRow(rows[0]), bootstrapAdmin }
}
