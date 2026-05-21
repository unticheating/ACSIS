import {
  BookIcon,
  ChartBarIcon,
  ChartLineIcon,
  FileDescriptionIcon,
  GearIcon,
  GlobeIcon,
  LayoutDashboardIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
  UsersIcon,
} from '../components/icons/navIcons.js'
import { getClassById, getExamInClass } from '../lib/classesExams.js'

/** Navigation only — chrome (names, avatars) comes from SessionContext. */
export const shellConfig = {
  teacher: {
    nav: [
      { to: '/teacher', label: 'Dashboard', end: true, icon: LayoutDashboardIcon },
      { to: '/teacher/my-classes', label: 'My Classes', mobileLabel: 'Classes', icon: BookIcon },
      { to: '/teacher/detections', label: 'Detections', icon: TriangleAlertIcon },
      { to: '/teacher/reports', label: 'Reports', icon: ChartBarIcon },
    ],
  },
  student: {
    nav: [
      { to: '/student/my-classes', label: 'Enrolled classes', mobileLabel: 'Classes', icon: BookIcon },
      { to: '/student/performance', label: 'Performance', mobileLabel: 'Performance', icon: ChartLineIcon },
      { to: '/student/reports', label: 'Reports', mobileLabel: 'Reports', icon: FileDescriptionIcon },
    ],
  },
  admin: {
    nav: [
      { to: '/admin', label: 'Dashboard', end: true, icon: LayoutDashboardIcon },
      { to: '/admin/classes', label: 'Classes', icon: FileDescriptionIcon },
      { to: '/admin/violations', label: 'Violation Records', mobileLabel: 'Violations', icon: ShieldCheckIcon },
      { to: '/admin/users', label: 'User Management', mobileLabel: 'Users', icon: UsersIcon },
      { to: '/admin/settings', label: 'System Settings', mobileLabel: 'Settings', icon: GearIcon },
    ],
  },
  /** Platform scope (multi-tenant) — same shell pattern as institution admin for the demo. */
  super_admin: {
    nav: [
      { to: '/super-admin', label: 'Platform', end: true, icon: LayoutDashboardIcon },
      { to: '/super-admin/institutions', label: 'Institutions', mobileLabel: 'Schools', icon: GlobeIcon },
      { to: '/super-admin/analytics', label: 'System Analytics', mobileLabel: 'Analytics', icon: ChartBarIcon },
      { to: '/super-admin/users', label: 'User Management', mobileLabel: 'Users', icon: UsersIcon },
      { to: '/super-admin/settings', label: 'System Settings', mobileLabel: 'Settings', icon: GearIcon },
    ],
  },
}

/**
 * Breadcrumb page segment (matches in-page admin/teacher/student headers).
 * @param {'teacher' | 'student' | 'admin' | 'super_admin'} role
 * @param {string} pathname
 */
export function resolveShellPageTitle(role, pathname) {
  if (role === 'super_admin' && pathname === '/super-admin') {
    return 'Super admin'
  }

  if (role === 'teacher') {
    const examDetail = pathname.match(/^\/teacher\/my-classes\/([^/]+)\/exams\/([^/]+)$/)
    if (examDetail) {
      const hit = getExamInClass(examDetail[1], examDetail[2])
      if (hit?.exam?.title) return hit.exam.title
    }
    const classStream = pathname.match(/^\/teacher\/my-classes\/([^/]+)$/)
    if (classStream) {
      const cls = getClassById(classStream[1])
      if (cls?.name) return cls.name
    }
  }

  if (role === 'student') {
    const clsPath = pathname.match(/^\/student\/my-classes\/([^/]+)$/)
    if (clsPath) {
      const cls = getClassById(clsPath[1])
      if (cls?.name) return cls.name
    }
  }

  const extras =
    role === 'teacher'
      ? { '/teacher/create-exam': 'Create examination' }
      : role === 'student'
        ? { '/student/performance': 'Performance' }
        : {}

  const extra = extras[pathname]
  if (extra) return extra

  const nav = shellConfig[role].nav
  for (const item of nav) {
    if (item.end && pathname === item.to) return item.label
  }
  const ordered = nav.filter((i) => !i.end).sort((a, b) => b.to.length - a.to.length)
  for (const item of ordered) {
    if (pathname === item.to || pathname.startsWith(`${item.to}/`)) return item.label
  }
  if (role === 'super_admin') return 'Super admin'
  return role === 'student' ? 'Enrolled classes' : 'Dashboard'
}
