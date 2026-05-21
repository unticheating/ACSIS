import { createClassQuery, listAdminClassesQuery, listTeacherClassesQuery, getTeacherDashboardStatsQuery } from '../repositories/classRepository.js';

const CLASS_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateClassAccessCode() {
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    code += CLASS_CODE_CHARS[Math.floor(Math.random() * CLASS_CODE_CHARS.length)];
  }
  return code;
}

export async function createClassService(institutionId, memberId, className, schoolYear, semester) {
  if (!className || !schoolYear || !semester || !memberId) {
    return { ok: false, error: 'Missing required fields.' };
  }
  const accessCode = generateClassAccessCode();
  
  try {
    const newClass = await createClassQuery(institutionId, memberId, className, schoolYear, semester, accessCode);
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
