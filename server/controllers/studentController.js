import { enrollByAccessCode, getEnrolledClasses, unenrollFromClass } from '../services/studentService.js';
import { upsertStudentNumber } from '../lib/studentProfile.js';
import { getPool } from '../db.js';

export async function enroll(req, res) {
  try {
    const { accessCode } = req.body;
    if (!accessCode || typeof accessCode !== 'string') {
      return res.status(400).json({ error: 'Access code is required.' });
    }

    const result = await enrollByAccessCode(req.memberId, accessCode);
    if (!result.ok) {
      return res.status(404).json({ error: result.error });
    }

    return res.json(result);
  } catch (err) {
    console.error('[studentController.enroll]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

export async function getClasses(req, res) {
  try {
    const classes = await getEnrolledClasses(req.memberId);
    return res.json(classes);
  } catch (err) {
    console.error('[studentController.getClasses]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

export async function unenroll(req, res) {
  try {
    const classId = req.params.classId;
    if (!classId) {
      return res.status(400).json({ error: 'Class id is required.' });
    }
    const result = await unenrollFromClass(req.memberId, classId);
    if (!result.ok) {
      return res.status(result.status || 400).json({ error: result.error });
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('[studentController.unenroll]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

export async function updateStudentNumber(req, res) {
  try {
    const { studentNumber } = req.body;
    if (!studentNumber || typeof studentNumber !== 'string' || !studentNumber.trim()) {
      return res.status(400).json({ error: 'Student number is required.' });
    }
    const pool = getPool();
    await upsertStudentNumber(pool, req.memberId, req.institutionId, studentNumber.trim());
    return res.json({ ok: true });
  } catch (err) {
    console.error('[studentController.updateStudentNumber]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
