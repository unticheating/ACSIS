/** User-facing label for a term value (DB stores 1st, 2nd, Summer). */
export function formatSemesterLabel(semester) {
  const raw = String(semester || '').trim()
  if (!raw) return ''
  const normalized = raw.replace(/\s+[Ss]emester$/i, '').trim()
  if (normalized === 'Summer') return 'Summer Term'
  if (/^(1st|2nd)$/i.test(normalized)) return `${normalized} Term`
  if (/\bterm$/i.test(raw)) return raw.replace(/\b[Ss]emester\b/g, 'Term')
  return `${normalized} Term`
}
