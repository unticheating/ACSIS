import { recordTeacherActivityQuery } from '../repositories/teacherActivityRepository.js'

const PORTAL_LABELS = {
  teacher: 'Teacher',
  student: 'Student',
  admin: 'Administrator',
}

/**
 * Record an institution-scoped sign-in for any portal user.
 * @param {{ portal?: string, memberId?: number | null }} session
 * @param {string} [method]
 */
export function recordUserLogin(session, method = 'Signed in') {
  const portal = session?.portal
  const memberId = session?.memberId
  if (!memberId || !portal || portal === 'super_admin') return

  const roleLabel = PORTAL_LABELS[portal] || String(portal)
  void recordTeacherActivityQuery({
    teacherMemberId: memberId,
    eventType: 'user_login',
    details: `${roleLabel} · ${method}`,
  }).catch((err) => {
    console.error('[userLoginAudit.recordUserLogin]', err)
  })
}
