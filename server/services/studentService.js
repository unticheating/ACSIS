import {
  checkEnrollment,
  enrollStudent,
  findClassByAccessCode,
  getEnrolledClasses as getClassesRepo,
  getStudentMember,
} from '../repositories/studentRepository.js';

export async function enrollByAccessCode(memberId, code) {
  const trimmed = String(code || '').trim();
  if (!trimmed) {
    return { ok: false, error: 'Class code is required.' };
  }

  const student = await getStudentMember(memberId);
  if (!student || student.role !== 'student') {
    return { ok: false, error: 'Only students can join a class with a class code.' };
  }

  const targetClass = await findClassByAccessCode(trimmed);
  if (!targetClass) {
    return { ok: false, error: 'Invalid or inactive class code.' };
  }

  if (targetClass.institution_id !== student.institution_id) {
    return { ok: false, error: 'This class code does not belong to your school.' };
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
