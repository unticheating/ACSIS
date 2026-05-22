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
    return res.json(classes);
  } catch (err) {
    console.error('[studentController.getClasses]', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
