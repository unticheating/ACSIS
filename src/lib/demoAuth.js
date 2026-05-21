import { demoAccounts } from '@/context/SessionContext.jsx'

/** Map demo / dev email patterns to portal accounts (until real auth is wired). */
export function pickAccountFromEmail(email) {
  const e = String(email || '').toLowerCase().trim()
  if (!e) return demoAccounts.find((a) => a.id === 'student')
  if (
    e.includes('superadmin') ||
    e.includes('super-admin') ||
    e.includes('acsissuper') ||
    e.includes('platform@')
  ) {
    return demoAccounts.find((a) => a.id === 'super')
  }
  if (e.includes('acsisadmin') || e.includes('admin@')) return demoAccounts.find((a) => a.id === 'admin')
  if (e.includes('faculty') || e.includes('alvarez') || e.includes('juanito'))
    return demoAccounts.find((a) => a.id === 'faculty')
  return demoAccounts.find((a) => a.id === 'student')
}
