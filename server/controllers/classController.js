import { getPool } from '../db.js';
import { createClassService, getAdminClassesService, getTeacherClassesService, getTeacherDashboardStatsService } from '../services/classService.js';

export async function createAdminClass(req, res) {
  const { name, academicYear, semester, professorId } = req.body;
  if (!name || !academicYear || !semester || !professorId) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const result = await createClassService(req.institutionId, professorId, name, academicYear, semester);
  if (!result.ok) {
    return res.status(500).json({ error: result.error });
  }
  return res.status(201).json(result.classData);
}

export async function getAdminClasses(req, res) {
  const result = await getAdminClassesService(req.institutionId);
  if (!result.ok) {
    return res.status(500).json({ error: result.error });
  }
  return res.json(result.classes);
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

export async function createTeacherClass(req, res) {
  const { name, academicYear, semester } = req.body;
  if (!name?.trim() || !academicYear?.trim() || !semester?.trim()) {
    return res.status(400).json({ error: 'Class name, academic year, and semester are required.' });
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

    const result = await createClassService(
      rows[0].institution_id,
      req.memberId,
      name.trim(),
      academicYear.trim(),
      semester.trim(),
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
