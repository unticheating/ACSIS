import { getPool } from '../db.js';
import {
  createClassService,
  getTeacherClassesService,
  getTeacherDashboardStatsService,
  getTeacherClassEnrollmentsService,
  updateTeacherClassService,
  deleteTeacherClassService,
} from '../services/classService.js';
import {
  deleteAdminClassService,
  getAdminClassesWithExamsService,
  updateAdminClassService,
} from '../services/adminService.js';

export async function createAdminClass(req, res) {
  const { name, academicYear, semester, professorId } = req.body;
  if (!name || !academicYear || !semester || !professorId) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const { courseCode } = req.body;
  const result = await createClassService(req.institutionId, professorId, courseCode || 'COURSE', name, academicYear, semester);
  if (!result.ok) {
    return res.status(500).json({ error: result.error });
  }
  return res.status(201).json(result.classData);
}

export async function getAdminClasses(req, res) {
  const result = await getAdminClassesWithExamsService(req.institutionId);
  if (!result.ok) {
    return res.status(500).json({ error: result.error });
  }
  return res.json(result.classes);
}

export async function updateAdminClass(req, res) {
  const classId = Number(req.params.classId);
  if (!Number.isFinite(classId)) {
    return res.status(400).json({ error: 'Invalid class id.' });
  }
  const result = await updateAdminClassService(req.institutionId, classId, req.body);
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error });
  }
  return res.json(result.class);
}

export async function deleteAdminClass(req, res) {
  const classId = Number(req.params.classId);
  if (!Number.isFinite(classId)) {
    return res.status(400).json({ error: 'Invalid class id.' });
  }
  const result = await deleteAdminClassService(req.institutionId, classId);
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error });
  }
  return res.json({ ok: true });
}

export async function getTeacherClasses(req, res) {
  const result = await getTeacherClassesService(req.memberId);
  if (!result.ok) {
    return res.status(500).json({ error: result.error });
  }
  return res.json(result.classes);
}

export async function getTeacherDashboard(req, res) {
  const result = await getTeacherDashboardStatsService(req.memberId);
  if (!result.ok) {
    return res.status(500).json({ error: result.error });
  }
  return res.json(result.stats);
}

export async function getTeacherClassEnrollments(req, res) {
  const classId = Number(req.params.classId);
  if (!Number.isFinite(classId)) {
    return res.status(400).json({ error: 'Invalid class id.' });
  }
  const result = await getTeacherClassEnrollmentsService(req.memberId, classId);
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error });
  }
  return res.json(result.students);
}

export async function updateTeacherClass(req, res) {
  const classId = Number(req.params.classId);
  if (!Number.isFinite(classId)) {
    return res.status(400).json({ error: 'Invalid class id.' });
  }
  const result = await updateTeacherClassService(req.memberId, classId, req.body);
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error });
  }
  return res.json(result.classData);
}

export async function deleteTeacherClass(req, res) {
  const classId = Number(req.params.classId);
  if (!Number.isFinite(classId)) {
    return res.status(400).json({ error: 'Invalid class id.' });
  }
  const result = await deleteTeacherClassService(req.memberId, classId);
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error });
  }
  return res.json({ ok: true });
}

export async function createTeacherClass(req, res) {
  const { name, courseCode, academicYear, semester, termId } = req.body;
  if (!name?.trim() || !courseCode?.trim()) {
    return res.status(400).json({ error: 'Subject code and course name are required.' });
  }

  const pool = getPool();
  if (!pool) {
    return res.status(503).json({ error: 'Database unavailable.' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT institution_id FROM institution_members
       WHERE member_id = $1 AND is_active = TRUE
       LIMIT 1`,
      [req.memberId],
    );
    if (!rows[0]?.institution_id) {
      return res.status(403).json({ error: 'Teacher membership not found.' });
    }

    let resolvedYear = academicYear?.trim() || '';
    let resolvedSemester = semester?.trim() || '';
    let resolvedTermId = termId != null && termId !== '' ? Number(termId) : null;

    if (resolvedTermId != null && Number.isFinite(resolvedTermId)) {
      const termRow = await pool.query(
        `SELECT school_year, semester FROM teaching_terms
         WHERE term_id = $1 AND member_id = $2`,
        [resolvedTermId, req.memberId],
      );
      if (!termRow.rows[0]) {
        return res.status(400).json({ error: 'Section not found for this teacher.' });
      }
      resolvedYear = termRow.rows[0].school_year;
      resolvedSemester = termRow.rows[0].semester;
    } else {
      resolvedTermId = null;
      if (!resolvedYear || !resolvedSemester) {
        return res.status(400).json({ error: 'Academic year and semester are required when no section is selected.' });
      }
    }

    const result = await createClassService(
      rows[0].institution_id,
      req.memberId,
      courseCode.trim(),
      name.trim(),
      resolvedYear,
      resolvedSemester,
      resolvedTermId,
    );
    if (!result.ok) {
      return res.status(500).json({ error: result.error });
    }
    return res.status(201).json(result.classData);
  } catch (err) {
    console.error('[createTeacherClass]', err);
    return res.status(500).json({ error: 'Failed to create class.' });
  }
}
