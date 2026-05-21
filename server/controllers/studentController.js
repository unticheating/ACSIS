import { enrollByAccessCode, getEnrolledClasses } from '../services/studentService.js';

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
    // Include an empty exams array for each class so the frontend doesn't break
    // Since we are only building class enrollment right now, exams will be empty.
    const withExams = classes.map(c => ({ ...c, exams: [] }));
    return res.json(withExams);
  } catch (err) {
    console.error('[studentController.getClasses]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
