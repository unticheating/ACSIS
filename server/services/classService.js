import {
  createClassQuery,
  listAdminClassesQuery,
  listTeacherClassesQuery,
  getTeacherDashboardStatsQuery,
  getTeacherClassByIdQuery,
  listClassEnrolledStudentsQuery,
  updateTeacherClassQuery,
  deactivateTeacherClassQuery,
} from '../repositories/classRepository.js';

const CLASS_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateClassAccessCode() {
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    code += CLASS_CODE_CHARS[Math.floor(Math.random() * CLASS_CODE_CHARS.length)];
  }
  return code;
}

export async function createClassService(
  institutionId,
  memberId,
  courseCode,
  className,
  schoolYear,
  semester,
  termId = null,
) {
  if (!courseCode || !className || !schoolYear || !semester || !memberId) {
    return { ok: false, error: 'Missing required fields.' };
  }
  const accessCode = generateClassAccessCode();

  try {
    const newClass = await createClassQuery(
      institutionId,
      memberId,
      courseCode,
      className,
      schoolYear,
      semester,
      accessCode,
      termId,
    );
    return { ok: true, classData: newClass };
  } catch (err) {
    console.error('[classService.createClass]', err);
    return { ok: false, error: 'Database error. Access code might have collided.' };
  }
}

export async function getAdminClassesService(institutionId) {
  try {
    const rows = await listAdminClassesQuery(institutionId);
    return { ok: true, classes: rows };
  } catch (err) {
    console.error('[classService.getAdminClasses]', err);
    return { ok: false, error: 'Database error.' };
  }
}

export async function getTeacherClassesService(memberId) {
  try {
    const rows = await listTeacherClassesQuery(memberId);
    return { ok: true, classes: rows };
  } catch (err) {
    console.error('[classService.getTeacherClasses]', err);
    return { ok: false, error: 'Database error.' };
  }
}

export async function getTeacherClassEnrollmentsService(memberId, classId) {
  try {
    const cls = await getTeacherClassByIdQuery(classId, memberId);
    if (!cls) {
      return { ok: false, status: 404, error: 'Class not found.' };
    }
    const students = await listClassEnrolledStudentsQuery(classId, memberId);
    return { ok: true, students };
  } catch (err) {
    console.error('[classService.getTeacherClassEnrollments]', err);
    return { ok: false, error: 'Database error.' };
  }
}

export async function updateTeacherClassService(memberId, classId, body) {
  const courseCode = typeof body.courseCode === 'string' ? body.courseCode.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!courseCode && !name) {
    return { ok: false, status: 400, error: 'Subject code or course name is required.' };
  }
  try {
    const updated = await updateTeacherClassQuery(classId, memberId, {
      courseCode: courseCode || null,
      name: name || null,
    });
    if (!updated) {
      return { ok: false, status: 404, error: 'Class not found.' };
    }
    return { ok: true, classData: updated };
  } catch (err) {
    console.error('[classService.updateTeacherClass]', err);
    return { ok: false, error: 'Failed to update course.' };
  }
}

export async function deleteTeacherClassService(memberId, classId) {
  try {
    const ok = await deactivateTeacherClassQuery(classId, memberId);
    if (!ok) {
      return { ok: false, status: 404, error: 'Class not found.' };
    }
    return { ok: true };
  } catch (err) {
    console.error('[classService.deleteTeacherClass]', err);
    return { ok: false, error: 'Failed to delete course.' };
  }
}

export async function getTeacherDashboardStatsService(memberId) {
  try {
    const stats = await getTeacherDashboardStatsQuery(memberId);
    return { 
      ok: true, 
      stats: {
        totalClasses: Number(stats?.totalClasses || 0),
        activeExams: Number(stats?.activeExams || 0),
        totalStudents: Number(stats?.totalStudents || 0)
      }
    };
  } catch (err) {
    console.error('[classService.getTeacherDashboardStats]', err);
    return { ok: false, error: 'Database error.' };
  }
}
