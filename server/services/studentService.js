import { checkEnrollment, enrollStudent, findClassByAccessCode, getEnrolledClasses as getClassesRepo } from '../repositories/studentRepository.js';

export async function enrollByAccessCode(memberId, code) {
  const targetClass = await findClassByAccessCode(code);
  if (!targetClass) {
    return { ok: false, error: 'Invalid or inactive access code.' };
  }

  const isEnrolled = await checkEnrollment(memberId, targetClass.class_id);
  if (isEnrolled) {
    return { ok: true, already: true, className: targetClass.class_name };
  }

  await enrollStudent(memberId, targetClass.class_id);
  return { ok: true, already: false, className: targetClass.class_name };
}

export async function getEnrolledClasses(memberId) {
  return await getClassesRepo(memberId);
}
