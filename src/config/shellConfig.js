import {
  AlertCircle,
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  LayoutGrid,
  Radio,
  ScrollText,
  Settings,
  Shield,
  TrendingUp,
  UsersRound,
  Building2,
} from 'lucide-react'
/** Navigation only — chrome (names, avatars) comes from SessionContext. */
export const shellConfig = {
  teacher: {
    nav: [
      { to: '/teacher', label: 'Dashboard', end: true, icon: LayoutGrid },
      { to: '/teacher/my-classes', label: 'My Classes', mobileLabel: 'Classes', icon: ClipboardList },
      { to: '/teacher/detections', label: 'Detections', icon: AlertCircle },
      { to: '/teacher/logs', label: 'Audit logs', mobileLabel: 'Audit', icon: ScrollText },
      { to: '/teacher/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  student: {
    nav: [
      { to: '/student/my-classes', label: 'Enrolled classes', mobileLabel: 'Classes', icon: ClipboardList },
      { to: '/student/performance', label: 'Performance', mobileLabel: 'Performance', icon: TrendingUp },
    ],
  },
  admin: {
    nav: [
      { to: '/admin', label: 'Dashboard', end: true, icon: LayoutDashboard },
      { to: '/admin/monitoring', label: 'Monitoring and Audit', icon: Radio },
      { to: '/admin/violations', label: 'Violation Records', mobileLabel: 'Violations', icon: Shield },
      { to: '/admin/users', label: 'User Management', mobileLabel: 'Users', icon: UsersRound },
      { to: '/admin/settings', label: 'Institution settings', mobileLabel: 'Settings', icon: Settings },
    ],
  },
  /** Platform scope (multi-tenant) — same shell pattern as institution admin for the demo. */
  super_admin: {
    nav: [
      { to: '/super-admin', label: 'Platform', end: true, icon: LayoutDashboard },
      { to: '/super-admin/institutions', label: 'Institutions', mobileLabel: 'Schools', icon: Building2 },
      { to: '/super-admin/analytics', label: 'System Analytics', mobileLabel: 'Analytics', icon: BarChart3 },
      { to: '/super-admin/users', label: 'User Management', mobileLabel: 'Users', icon: UsersRound },
      { to: '/super-admin/settings', label: 'System Settings', mobileLabel: 'Settings', icon: Settings },
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
    const sectionCourses = pathname.match(/^\/teacher\/my-classes\/(?:section|term)\/([^/]+)$/)
    if (sectionCourses) {
      return 'Courses'
    }
    const examDetail = pathname.match(/^\/teacher\/my-classes\/([^/]+)\/exams\/([^/]+)$/)
    if (examDetail) {
      return 'Exam'
    }
    const classStream = pathname.match(/^\/teacher\/my-classes\/(?!section\/|term\/)([^/]+)$/)
    if (classStream) {
      return 'Exams'
    }
    if (pathname === '/teacher/logs') {
      return 'Logs'
    }
  }

  if (role === 'student') {
    const clsPath = pathname.match(/^\/student\/my-classes\/([^/]+)$/)
    if (clsPath) {
      return 'Class'
    }
  }

  const extras =
    role === 'teacher'
      ? { '/teacher/create-exam': 'Exam Builder' }
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
