import { getClassByIdQuery, getTeacherClassByIdQuery } from '../repositories/classRepository.js'
import {
  closeOtherTeacherOngoingExamsQuery,
  computeExamRanksQuery,
  dismissCheatingLogQuery,
  getCheatingLogForTeacherDismissQuery,
  getExamSubmissionStatsQuery,
  getTeacherActiveMonitoringExamQuery,
  getTopRankedSessionQuery,
  listCheatingLogsForExamQuery,
  listCheatingLogsForSessionQuery,
  listClassEnrolledStudentsQuery,
  listExamSessionsForExamQuery,
  listExamsForTeacherReportsQuery,
  listStudentAnswersForSessionQuery,
  listStudentPerformanceQuery,
} from '../repositories/examResultsRepository.js'
import {
  listTeacherActivityLogsQuery,
  recordTeacherActivityQuery,
} from '../repositories/teacherActivityRepository.js'
import {
  listTeacherExamAssignmentRosterQuery,
  replaceExamAssignmentsQuery,
} from '../repositories/examAssignmentRepository.js'
import { getPool } from '../db.js'
import { getExamForJoinQuery } from '../repositories/examSessionRepository.js'
import { ensureExamSessionLockedColumns } from '../lib/ensureExamSessionLockedSchema.js'
import { getInstitutionMaxWarnings } from '../repositories/adminRepository.js'
import { shouldLockExam } from '../lib/examSessionRules.js'
import { notifyMonitoringUpdate } from '../lib/monitoringBroadcast.js'
import { EXAM_STATUS } from '../lib/examStatus.js'

function mapMonitoringExamMeta(examRow) {
  const status = (examRow.status || '').toLowerCase()
  return {
    id: examRow.exam_id,
    title: examRow.title,
    status: examRow.status,
    code: examRow.password,
    scheduledStart: examRow.scheduledStart || examRow.scheduled_start || null,
    scheduledEnd: examRow.scheduledEnd || examRow.scheduled_end || null,
    openedAt: status === EXAM_STATUS.OPEN && examRow.updated_at ? examRow.updated_at : null,
    updatedAt: examRow.updated_at || null,
  }
}

function buildMonitoringRoster(enrolled, sessions) {
  const byMember = new Map()
  for (const s of sessions) {
    if (s.memberId != null) byMember.set(Number(s.memberId), s)
  }
  return enrolled.map((student) => {
    const sess = byMember.get(Number(student.memberId))
    if (!sess) {
      return {
        memberId: student.memberId,
        studentName: student.studentName,
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        avatarUrl: student.avatarUrl || null,
        schoolId: student.schoolId,
        sessionId: null,
        status: null,
        warningCount: 0,
        joined: false,
      }
    }
    return {
      memberId: student.memberId,
      studentName: sess.studentName || student.studentName,
      firstName: sess.firstName || student.firstName || '',
      lastName: sess.lastName || student.lastName || '',
      avatarUrl: sess.avatarUrl || student.avatarUrl || null,
      schoolId: sess.schoolId || student.schoolId,
      sessionId: sess.sessionId,
      status: sess.status,
      warningCount: sess.warningCount,
      joined: true,
      submittedAt: sess.submittedAt,
      violationCount: sess.violationCount,
    }
  })
}

export async function getTeacherActiveMonitoringService(teacherMemberId) {
  try {
    const active = await getTeacherActiveMonitoringExamQuery(teacherMemberId)
    if (!active) {
      return { ok: true, activeExam: null }
    }
    const snapshot = await getTeacherMonitoringSnapshotService(
      active.classId,
      active.id,
      teacherMemberId,
    )
    if (!snapshot.ok) return snapshot
    return {
      ok: true,
      activeExam: {
        id: active.id,
        title: active.title,
        status: active.status,
        code: active.code,
        classId: active.classId,
        className: active.className,
        scheduledStart: active.scheduledStart || null,
        scheduledEnd: active.scheduledEnd || null,
        openedAt:
          (active.status || '').toLowerCase() === EXAM_STATUS.OPEN && active.updatedAt
            ? active.updatedAt
            : null,
        updatedAt: active.updatedAt,
      },
      ...snapshot,
    }
  } catch (err) {
    console.error('[examResultsService.getTeacherActiveMonitoring]', err)
    return { ok: false, status: 500, error: 'Failed to load live monitoring.' }
  }
}

export async function getTeacherMonitoringSnapshotService(classId, examId, _teacherMemberId) {
  try {
    const cls = await getClassByIdQuery(classId)
    if (!cls) {
      return { ok: false, status: 404, error: 'Class not found.' }
    }

    const exam = await getExamForJoinQuery(classId, examId)
    if (!exam) {
      return { ok: false, status: 404, error: 'Exam not found.' }
    }

    await computeExamRanksQuery(examId)

    const [sessions, stats, violations, enrolled] = await Promise.all([
      listExamSessionsForExamQuery(classId, examId),
      getExamSubmissionStatsQuery(examId),
      listCheatingLogsForExamQuery(examId),
      listClassEnrolledStudentsQuery(classId),
    ])

    const roster = buildMonitoringRoster(enrolled, sessions)

    return {
      ok: true,
      exam: mapMonitoringExamMeta(exam),
      stats: {
        enrolled: Number(stats.enrolled || 0),
        joined: Number(stats.joined || 0),
        submitted: Number(stats.submitted || 0),
      },
      sessions,
      roster,
      violations: violations.map((v) => ({
        id: v.id,
        sessionId: v.sessionId,
        eventType: v.eventType,
        details: v.details,
        occurredAt: v.occurredAt,
        dismissedAt: v.dismissedAt,
        studentName: v.studentName,
        schoolId: v.schoolId,
      })),
    }
  } catch (err) {
    console.error('[examResultsService.getTeacherMonitoringSnapshot]', err)
    return { ok: false, status: 500, error: 'Failed to load monitoring data.' }
  }
}

export async function getTeacherExamResultsService(classId, examId, teacherMemberId) {
  try {
    const cls = await getClassByIdQuery(classId)
    if (!cls) {
      return { ok: false, status: 404, error: 'Class not found.' }
    }

    const exam = await getExamForJoinQuery(classId, examId)
    if (!exam) {
      return { ok: false, status: 404, error: 'Exam not found.' }
    }

    await computeExamRanksQuery(examId)

    const [sessions, stats, violations, topStudent] = await Promise.all([
      listExamSessionsForExamQuery(classId, examId),
      getExamSubmissionStatsQuery(examId),
      listCheatingLogsForExamQuery(examId),
      getTopRankedSessionQuery(examId),
    ])

    return {
      ok: true,
      exam: mapMonitoringExamMeta(exam),
      stats: {
        enrolled: Number(stats.enrolled || 0),
        joined: Number(stats.joined || 0),
        submitted: Number(stats.submitted || 0),
      },
      topStudent: topStudent
        ? {
            sessionId: topStudent.sessionId,
            studentName: topStudent.studentName,
            schoolId: topStudent.schoolId,
            percentage: topStudent.percentage != null ? Number(topStudent.percentage) : null,
            rawScore: topStudent.rawScore != null ? Number(topStudent.rawScore) : null,
            totalPoints: topStudent.totalPoints != null ? Number(topStudent.totalPoints) : null,
          }
        : null,
      sessions,
      violations: violations.map((v) => ({
        id: v.id,
        sessionId: v.sessionId,
        eventType: v.eventType,
        details: v.details,
        occurredAt: v.occurredAt,
        dismissedAt: v.dismissedAt,
        studentName: v.studentName,
        schoolId: v.schoolId,
      })),
    }
  } catch (err) {
    console.error('[examResultsService.getTeacherExamResults]', err)
    return { ok: false, status: 500, error: 'Failed to load exam results.' }
  }
}

export async function dismissTeacherViolationService(
  classId,
  examId,
  sessionId,
  logId,
  teacherMemberId,
) {
  try {
    const cls = await getTeacherClassByIdQuery(classId, teacherMemberId)
    if (!cls) {
      return { ok: false, status: 404, error: 'Class not found.' }
    }

    const exam = await getExamForJoinQuery(classId, examId)
    if (!exam) {
      return { ok: false, status: 404, error: 'Exam not found.' }
    }

    const log = await getCheatingLogForTeacherDismissQuery(logId, classId, examId)
    if (!log || Number(log.sessionId) !== Number(sessionId)) {
      return { ok: false, status: 404, error: 'Violation not found.' }
    }

    const result = await dismissCheatingLogQuery(logId, sessionId, teacherMemberId)
    if (!result.ok) {
      return { ok: false, status: 404, error: 'Violation not found.' }
    }

    const maxWarnings = await getInstitutionMaxWarnings(exam.institution_id)
    let sessionUnlocked = false
    if (
      result.lockReason === 'max_warnings' &&
      result.lockedAt &&
      result.sessionStatus === 'in_progress' &&
      !shouldLockExam(result.warningCount, maxWarnings)
    ) {
      await ensureExamSessionLockedColumns()
      const pool = getPool()
      const { rows } = await pool.query(
        `UPDATE exam_sessions
         SET locked_at = NULL, lock_reason = NULL
         WHERE session_id = $1 AND status = 'in_progress'
         RETURNING session_id`,
        [sessionId],
      )
      sessionUnlocked = rows.length > 0
    }

    notifyMonitoringUpdate(classId, examId)

    return {
      ok: true,
      warningCount: result.warningCount,
      maxWarnings,
      sessionUnlocked,
      alreadyDismissed: Boolean(result.alreadyDismissed),
    }
  } catch (err) {
    console.error('[examResultsService.dismissTeacherViolation]', err)
    return { ok: false, status: 500, error: 'Failed to dismiss violation.' }
  }
}

export async function getTeacherExamSessionDetailService(classId, examId, sessionId) {
  try {
    const sessions = await listExamSessionsForExamQuery(classId, examId)
    const session = sessions.find((s) => s.sessionId === Number(sessionId))
    if (!session) {
      return { ok: false, status: 404, error: 'Session not found.' }
    }
    const [answers, violations] = await Promise.all([
      listStudentAnswersForSessionQuery(sessionId),
      listCheatingLogsForSessionQuery(sessionId),
    ])
    return { ok: true, session, answers, violations }
  } catch (err) {
    console.error('[examResultsService.getTeacherExamSessionDetail]', err)
    return { ok: false, status: 500, error: 'Failed to load session detail.' }
  }
}

export async function listTeacherReportExamsService(teacherMemberId) {
  try {
    const exams = await listExamsForTeacherReportsQuery(teacherMemberId)
    return { ok: true, exams }
  } catch (err) {
    console.error('[examResultsService.listTeacherReportExams]', err)
    return { ok: false, status: 500, error: 'Failed to load exams.' }
  }
}

export async function getTeacherExamAssignmentRosterService(classId, examId, teacherMemberId) {
  try {
    const roster = await listTeacherExamAssignmentRosterQuery(classId, examId, teacherMemberId)
    if (!roster) {
      return { ok: false, status: 404, error: 'Exam not found.' }
    }
    return { ok: true, ...roster }
  } catch (err) {
    console.error('[examResultsService.getTeacherExamAssignmentRoster]', err)
    return { ok: false, status: 500, error: 'Failed to load exam assignment roster.' }
  }
}

export async function updateTeacherExamAssignmentRosterService(classId, examId, teacherMemberId, studentMemberIds) {
  try {
    const cls = await getTeacherClassByIdQuery(classId, teacherMemberId)
    if (!cls) {
      return { ok: false, status: 403, error: 'Access denied.' }
    }
    const exam = await getExamForJoinQuery(classId, examId)
    if (!exam) {
      return { ok: false, status: 404, error: 'Exam not found.' }
    }
    const updated = await replaceExamAssignmentsQuery(classId, examId, teacherMemberId, studentMemberIds)
    if (!updated) {
      return { ok: false, status: 403, error: 'Access denied.' }
    }
    await recordTeacherActivityQuery({
      teacherMemberId,
      classId,
      examId,
      eventType: 'exam_assigned',
      details: `Assigned ${updated.assignedCount} student${updated.assignedCount === 1 ? '' : 's'}`,
    })
    return { ok: true, ...updated }
  } catch (err) {
    console.error('[examResultsService.updateTeacherExamAssignmentRoster]', err)
    return { ok: false, status: 500, error: 'Failed to save exam assignments.' }
  }
}

export async function getTeacherActivityLogsService(teacherMemberId, limit = 50) {
  try {
    const logs = await listTeacherActivityLogsQuery(teacherMemberId, limit)
    return { ok: true, logs }
  } catch (err) {
    console.error('[examResultsService.getTeacherActivityLogs]', err)
    return { ok: false, status: 500, error: 'Failed to load teacher activity logs.' }
  }
}

export async function getStudentPerformanceService(studentMemberId) {
  try {
    const rows = await listStudentPerformanceQuery(studentMemberId)
    const submitted = rows.filter((r) => r.status === 'submitted')
    const withScores = submitted.filter((r) => r.percentage != null)
    const average =
      withScores.length > 0
        ? Math.round(
            (withScores.reduce((sum, r) => sum + Number(r.percentage), 0) / withScores.length) * 100,
          ) / 100
        : null

    return {
      ok: true,
      averagePercentage: average,
      examsCompleted: submitted.length,
      totalWarnings: rows.reduce((sum, r) => sum + Number(r.warningCount || 0), 0),
      attempts: rows.map((r) => ({
        sessionId: r.sessionId,
        examId: r.examId,
        examTitle: r.examTitle,
        classId: r.classId,
        className: r.className,
        status: r.status,
        submittedAt: r.submittedAt,
        rawScore: r.rawScore != null ? Number(r.rawScore) : null,
        totalPoints: r.totalPoints != null ? Number(r.totalPoints) : null,
        percentage: r.percentage != null ? Number(r.percentage) : null,
        warningCount: Number(r.warningCount || 0),
      })),
    }
  } catch (err) {
    console.error('[examResultsService.getStudentPerformance]', err)
    return { ok: false, status: 500, error: 'Failed to load performance.' }
  }
}
