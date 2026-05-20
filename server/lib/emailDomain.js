/**
 * @param {string | undefined | null} email
 * @param {string} allowedDomain e.g. plpasig.edu.ph
 */
export function getEmailDomain(email) {
  if (!email || typeof email !== 'string') return null
  const trimmed = email.trim().toLowerCase()
  const at = trimmed.lastIndexOf('@')
  if (at <= 0 || at === trimmed.length - 1) return null
  return trimmed.slice(at + 1)
}

export function isAllowedInstitutionalEmail(email, allowedDomain) {
  const domain = getEmailDomain(email)
  if (!domain) return false
  return domain === allowedDomain.toLowerCase()
}
