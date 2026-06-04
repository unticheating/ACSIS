import { config } from '../config.js'
import { getEmailDomain, isAllowedInstitutionalEmail } from './emailDomain.js'

/** @type {RegExp} */
const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/

/**
 * @param {string | null | undefined} raw
 * @returns {{ ok: true, value: string | null } | { ok: false, error: string }}
 */
export function normalizeInstitutionEmailDomain(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return { ok: true, value: null }
  }
  const domain = String(raw).trim().toLowerCase().replace(/^@+/, '')
  if (!domain) {
    return { ok: true, value: null }
  }
  if (domain.length > 255) {
    return { ok: false, error: 'Email domain is too long.' }
  }
  if (!DOMAIN_REGEX.test(domain)) {
    return {
      ok: false,
      error: 'Enter a valid domain (example: school.edu.ph), without @.',
    }
  }
  return { ok: true, value: domain }
}

/**
 * @param {string | null | undefined} institutionDomain
 */
export function resolveInstitutionEmailDomain(institutionDomain) {
  const normalized =
    institutionDomain && String(institutionDomain).trim()
      ? String(institutionDomain).trim().toLowerCase()
      : ''
  return normalized || config.allowedEmailDomain
}

/**
 * @param {string | undefined | null} email
 */
export function isValidEmailAddress(email) {
  const trimmed = String(email || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return false
  return Boolean(getEmailDomain(trimmed))
}

/**
 * Students must use the institution domain. Faculty and admins may use any valid email
 * (part-time staff, contractors, password-login institution admins).
 *
 * @param {string} email
 * @param {'student' | 'faculty' | 'admin'} role
 * @param {string | null | undefined} institutionDomain
 */
export function validateUserEmailForRole(email, role, institutionDomain) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const domain = resolveInstitutionEmailDomain(institutionDomain)

  if (role === 'faculty' || role === 'admin') {
    if (!isValidEmailAddress(normalizedEmail)) {
      return { ok: false, error: 'Enter a valid email address.' }
    }
    return { ok: true }
  }

  if (!isAllowedInstitutionalEmail(normalizedEmail, domain)) {
    return { ok: false, error: `Email must be @${domain}.` }
  }
  return { ok: true }
}

/**
 * @param {import('pg').Pool} pool
 */
export async function getInstitutionEmailDomain(pool, institutionId) {
  const { rows } = await pool.query(
    `SELECT email_domain FROM institutions WHERE institution_id = $1 AND is_active = TRUE`,
    [institutionId],
  )
  return rows[0]?.email_domain ?? null
}

/**
 * Distinct domains from active institutions plus the env default.
 *
 * @param {import('pg').Pool} pool
 * @returns {Promise<string[]>}
 */
export async function listRegisteredEmailDomains(pool) {
  const { rows } = await pool.query(
    `SELECT DISTINCT LOWER(TRIM(email_domain)) AS domain
     FROM institutions
     WHERE is_active = TRUE
       AND email_domain IS NOT NULL
       AND TRIM(email_domain) <> ''`,
  )
  const fromDb = rows.map((row) => row.domain).filter(Boolean)
  if (fromDb.length > 0) {
    return [...new Set(fromDb)].sort()
  }
  return [config.allowedEmailDomain]
}

/**
 * Google sign-in: email domain must match an institution domain registered in ACSIS.
 *
 * @param {import('pg').Pool} pool
 * @param {string} email
 */
export async function isGoogleSignInEmailAllowed(pool, email) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!isValidEmailAddress(normalizedEmail)) return false

  const emailDomain = getEmailDomain(normalizedEmail)
  if (!emailDomain) return false

  const allowedDomains = await listRegisteredEmailDomains(pool)
  return allowedDomains.includes(emailDomain)
}

/**
 * @param {string[]} domains
 */
export function formatAllowedDomainsHint(domains) {
  const list = [...new Set(domains.filter(Boolean))].sort()
  if (list.length === 0) return 'your institution email'
  if (list.length === 1) return `@${list[0]}`
  if (list.length === 2) return `@${list[0]} or @${list[1]}`
  if (list.length === 3) return `@${list[0]}, @${list[1]}, or @${list[2]}`
  return `${list.slice(0, -1).map((d) => `@${d}`).join(', ')}, or @${list[list.length - 1]}`
}

/**
 * Full login-page copy built from institution settings in the database.
 *
 * @param {string[]} domains
 */
export function formatGoogleSignInHint(domains) {
  const list = [...new Set(domains.filter(Boolean))].sort()
  if (list.length === 0) {
    return 'Sign in with Google using your school Google Workspace account.'
  }
  return `Sign in with Google using your school account ${formatAllowedDomainsHint(list)} only.`
}
