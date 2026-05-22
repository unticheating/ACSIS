import {
  deactivateClassQuery,
  getAdminDashboardStatsQuery,
  getInstitutionMaxWarnings,
  getMonitoringStatsQuery,
  listActiveMonitoringSessionsQuery,
  listAdminReportsQuery,
  listDetectedStudentsQuery,
  listExamsForInstitutionQuery,
  listMonitoringActivityQuery,
  listOngoingExamsQuery,
  getViolationSessionDetailQuery,
  issueViolationTicketQuery,
  listViolationsQuery,
  updateClassQuery,
} from '../repositories/adminRepository.js'
import { listAdminClassesQuery } from '../repositories/classRepository.js'

/** Max rows shown per list on the admin dashboard preview. */
export const ADMIN_DASHBOARD_PREVIEW_LIMIT = 5

export async function getAdminDashboardService(institutionId) {
  try {
    const maxWarnings = await getInstitutionMaxWarnings(institutionId)
    const limit = ADMIN_DASHBOARD_PREVIEW_LIMIT
    const [stats, ongoingExams, detectedStudents] = await Promise.all([
      getAdminDashboardStatsQuery(institutionId),
      listOngoingExamsQuery(institutionId, limit),
      listDetectedStudentsQuery(institutionId, maxWarnings, limit),
    ])
    const ongoingTotal = Number(stats?.ongoingExams || 0)
    const detectedTotal = Number(stats?.detectedStudents || 0)
    return {
      ok: true,
      data: {
        stats: {
          ongoingExams: ongoingTotal,
          totalExams: Number(stats?.totalExams || 0),
          detectedStudents: detectedTotal,
        },
        previewLimit: limit,
        hasMoreOngoingExams: ongoingTotal > ongoingExams.length,
        hasMoreDetectedStudents: detectedTotal > detectedStudents.length,
        ongoingExams: ongoingExams.map((e) => ({
          id: e.id,
          name: e.title,
          by: e.professorName,
          done: `${e.submitted} / ${e.enrolled} Done`,
          status: e.status,
          updatedAt: e.updated_at,
        })),
        detectedStudents,
        maxWarnings,
      },
    }
  } catch (err) {
    console.error('[adminService.getAdminDashboard]', err)
    return { ok: false, error: 'Database error.' }
  }
}

export async function listViolationsService(institutionId) {
  try {
    const maxWarnings = await getInstitutionMaxWarnings(institutionId)
    const violations = await listViolationsQuery(institutionId, maxWarnings)
    return { ok: true, violations, count: violations.length, maxWarnings }
  } catch (err) {
    console.error('[adminService.listViolations]', err)
    return { ok: false, error: 'Database error.' }
  }
}

export async function issueViolationTicketService(institutionId, sessionId, adminMemberId) {
  try {
    const sid = Number(sessionId)
    if (!Number.isFinite(sid)) {
      return { ok: false, status: 400, error: 'Invalid session id.' }
    }
    const row = await issueViolationTicketQuery(institutionId, sid, adminMemberId)
    if (!row) {
      return { ok: false, status: 404, error: 'Session not found or ticket already issued.' }
    }
    return { ok: true, sessionId: row.sessionId, ticketIssuedAt: row.ticketIssuedAt }
  } catch (err) {
    console.error('[adminService.issueViolationTicket]', err)
    return { ok: false, status: 500, error: 'Failed to issue ticket.' }
  }
}

export async function getViolationSessionDetailService(institutionId, sessionId) {
  try {
    const sid = Number(sessionId)
    if (!Number.isFinite(sid)) {
      return { ok: false, status: 400, error: 'Invalid session id.' }
    }
    const detail = await getViolationSessionDetailQuery(institutionId, sid)
    if (!detail) {
      return { ok: false, status: 404, error: 'Violation session not found.' }
    }
    const maxWarnings = await getInstitutionMaxWarnings(institutionId)
    return { ok: true, detail, maxWarnings }
  } catch (err) {
    console.error('[adminService.getViolationSessionDetail]', err)
    return { ok: false, error: 'Database error.' }
  }
}

export async function getMonitoringService(institutionId) {
  try {
    const [stats, cheatFeed, activeSessions] = await Promise.all([
      getMonitoringStatsQuery(institutionId),
      listMonitoringActivityQuery(institutionId),
      listActiveMonitoringSessionsQuery(institutionId),
    ])

    const seen = new Set(cheatFeed.map((a) => `log-${a.id}`))
    const activities = [...cheatFeed]
    for (const session of activeSessions) {
      if (!seen.has(`session-${session.id}`) && activities.length < 20) {
        activities.unshift(session)
      }
    }

    return {
      ok: true,
      stats: {
        activeSessions: Number(stats?.activeSessions || 0),
        beingMonitored: Number(stats?.beingMonitored || 0),
        recentAlerts: Number(stats?.recentAlerts || 0),
      },
      activities: activities.slice(0, 20),
    }
  } catch (err) {
    console.error('[adminService.getMonitoring]', err)
    return { ok: false, error: 'Database error.' }
  }
}

export async function listReportsService(institutionId) {
  try {
    const reports = await listAdminReportsQuery(institutionId)
    return { ok: true, reports }
  } catch (err) {
    console.error('[adminService.listReports]', err)
    return { ok: false, error: 'Database error.' }
  }
}

export async function getAdminClassesWithExamsService(institutionId) {
  try {
    const [classes, examRows] = await Promise.all([
      listAdminClassesQuery(institutionId),
      listExamsForInstitutionQuery(institutionId),
    ])
    const examsByClass = new Map()
    for (const exam of examRows) {
      const list = examsByClass.get(exam.classId) || []
      list.push({
        id: exam.id,
        title: exam.title,
        code: exam.code,
        duration: exam.duration,
        status: exam.status,
        questionCount: exam.questionCount,
        joinedCount: Number(exam.joinedCount || 0),
        submittedCount: Number(exam.submittedCount || 0),
      })
      examsByClass.set(exam.classId, list)
    }
    const classesWithExams = classes.map((c) => ({
      ...c,
      exams: examsByClass.get(c.id) || [],
    }))
    return { ok: true, classes: classesWithExams }
  } catch (err) {
    console.error('[adminService.getAdminClassesWithExams]', err)
    return { ok: false, error: 'Database error.' }
  }
}

export async function updateAdminClassService(institutionId, classId, body) {
  const name = String(body?.name || '').trim()
  const academicYear = String(body?.academicYear || '').trim()
  const semester = String(body?.semester || '').trim()
  if (!name || !academicYear || !semester) {
    return { ok: false, status: 400, error: 'Class name, academic year, and semester are required.' }
  }
  if (!['1st', '2nd', 'Summer'].includes(semester)) {
    return { ok: false, status: 400, error: 'Invalid semester.' }
  }
  try {
    const updated = await updateClassQuery(institutionId, classId, {
      name,
      academicYear,
      semester,
    })
    if (!updated) {
      return { ok: false, status: 404, error: 'Class not found.' }
    }
    return { ok: true, class: updated }
  } catch (err) {
    console.error('[adminService.updateAdminClass]', err)
    return { ok: false, status: 500, error: 'Database error.' }
  }
}

export async function deleteAdminClassService(institutionId, classId) {
  try {
    const removed = await deactivateClassQuery(institutionId, classId)
    if (!removed) {
      return { ok: false, status: 404, error: 'Class not found.' }
    }
    return { ok: true }
  } catch (err) {
    console.error('[adminService.deleteAdminClass]', err)
    return { ok: false, status: 500, error: 'Database error.' }
  }
}
