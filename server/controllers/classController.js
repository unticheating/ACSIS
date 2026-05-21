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
