/** Demo data for User Management UI (no database). */

/** @typedef {'student' | 'faculty' | 'admin'} UserRole */

/**
 * @typedef {object} DemoUser
 * @property {number} id
 * @property {string} name
 * @property {string} email
 * @property {UserRole} role
 * @property {'active' | 'inactive' | 'pending'} status
 * @property {string} schoolId
 * @property {string | null} yearLevel
 * @property {string | null} section
 * @property {string} dateCreated
 */

/** @type {DemoUser[]} */
export const demoUsers = [
  {
    id: 1,
    name: 'JUANITO ALVAREZ JR.',
    email: 'alvarez_juanito@example.com',
    role: 'faculty',
    status: 'active',
    schoolId: 'FAC-2019-0142',
    yearLevel: null,
    section: null,
    dateCreated: '5/2/2026',
  },
  {
    id: 2,
    name: 'RICHELLE DOROTHY BENITEZ',
    email: 'benitez_richelledorothy@example.com',
    role: 'student',
    status: 'active',
    schoolId: '2021-00481',
    yearLevel: '3rd Year',
    section: 'BSCS 3A',
    dateCreated: '5/2/2026',
  },
  {
    id: 3,
    name: 'HANZEL GWEN NANEZ',
    email: 'nanez_hanzelgwen@example.com',
    role: 'student',
    status: 'active',
    schoolId: '2022-01093',
    yearLevel: '2nd Year',
    section: 'BSCS 2B',
    dateCreated: '5/2/2026',
  },
  {
    id: 4,
    name: 'AVRIL LAVIGNE PASCUA',
    email: 'pascua_avrillavigne@example.com',
    role: 'student',
    status: 'active',
    schoolId: '2022-01104',
    yearLevel: '2nd Year',
    section: 'BSCS 2B',
    dateCreated: '5/2/2026',
  },
  {
    id: 5,
    name: 'KELLY ROWLAND LOLA',
    email: 'lola_kellyrowland@example.com',
    role: 'student',
    status: 'inactive',
    schoolId: '2020-00762',
    yearLevel: '4th Year',
    section: 'BSCS 4A',
    dateCreated: '5/2/2026',
  },
  {
    id: 6,
    name: 'RON MICHAEL LEGASPI',
    email: 'legaspi_ronmichael@example.com',
    role: 'student',
    status: 'active',
    schoolId: '2023-01588',
    yearLevel: '1st Year',
    section: 'BSCS 1A',
    dateCreated: '5/2/2026',
  },
  {
    id: 7,
    name: 'CARL AJ JUNIO',
    email: 'junio_carlaj@example.com',
    role: 'student',
    status: 'active',
    schoolId: '2021-00901',
    yearLevel: '3rd Year',
    section: 'BSCS 3A',
    dateCreated: '5/2/2026',
  },
  {
    id: 8,
    name: 'REX NAVARRO JR.',
    email: 'navarrojr_rex@example.com',
    role: 'student',
    status: 'active',
    schoolId: '2021-00499',
    yearLevel: '3rd Year',
    section: 'BSCS 3A',
    dateCreated: '5/2/2026',
  },
  {
    id: 9,
    name: 'JOHN EDRIAN MARTINEZ',
    email: 'martinez_johnedrian@example.com',
    role: 'student',
    status: 'active',
    schoolId: '2022-01220',
    yearLevel: '2nd Year',
    section: 'BSCS 2C',
    dateCreated: '5/2/2026',
  },
  {
    id: 10,
    name: 'MARIA CLARA SANTOS',
    email: 'santos_mariaclara@example.com',
    role: 'faculty',
    status: 'pending',
    schoolId: 'FAC-2026-0003',
    yearLevel: null,
    section: null,
    dateCreated: '5/18/2026',
  },
  {
    id: 11,
    name: 'ACSIS Administrator',
    email: 'admin@example.com',
    role: 'admin',
    status: 'active',
    schoolId: 'ADM-001',
    yearLevel: null,
    section: null,
    dateCreated: '5/1/2026',
  },
]

export function roleLabel(role) {
  if (role === 'faculty') return 'Faculty'
  if (role === 'admin') return 'Administrator'
  return 'Student'
}

export function statusLabel(status) {
  if (status === 'pending') return 'Pending'
  if (status === 'inactive') return 'Inactive'
  return 'Active'
}
