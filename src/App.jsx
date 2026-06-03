import { lazy } from 'react'
import TeacherClassExamsPage from './views/teacher/TeacherClassExamsPage.jsx'
import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'
import LazyPage from './components/layout/LazyPage.jsx'
import LoginPage from './views/LoginPage.jsx'
import ChangePasswordPage from './views/ChangePasswordPage.jsx'
import VerifyEmailPage from './views/VerifyEmailPage.jsx'
import PostOnboardingModal from './components/auth/PostOnboardingModal.jsx'
import { useSession } from './context/SessionContext.jsx'

const AdminLayout = lazy(() => import('./layouts/AdminLayout.jsx'))
const StudentLayout = lazy(() => import('./layouts/StudentLayout.jsx'))
const SuperAdminLayout = lazy(() => import('./layouts/SuperAdminLayout.jsx'))
const TeacherLayout = lazy(() => import('./layouts/TeacherLayout.jsx'))

const AdminDashboardPage = lazy(() => import('./views/admin/AdminDashboardPage.jsx'))
const AdminExaminationsPage = lazy(() => import('./views/admin/AdminExaminationsPage.jsx'))
const AdminPlaceholderPage = lazy(() => import('./views/admin/AdminPlaceholderPage.jsx'))
const AdminUserManagementPage = lazy(() => import('./views/admin/AdminUserManagementPage.jsx'))
const AdminSettingsPage = lazy(() => import('./views/admin/AdminSettingsPage.jsx'))
const AdminViolationsPage = lazy(() => import('./views/admin/AdminViolationsPage.jsx'))
const AdminMonitoringPage = lazy(() => import('./views/admin/AdminMonitoringPage.jsx'))
const AdminReportsPage = lazy(() => import('./views/admin/AdminReportsPage.jsx'))
const AdminSubjectsPage = lazy(() => import('./views/admin/AdminSubjectsPage.jsx'))
const DevPortalsPage = lazy(() => import('./views/DevPortalsPage.jsx'))

const StudentClassStreamPage = lazy(() => import('./views/student/StudentClassStreamPage.jsx'))
const StudentExamResultPage = lazy(() => import('./views/student/StudentExamResultPage.jsx'))
const StudentExamSessionPage = lazy(() => import('./views/student/StudentExamSessionPage.jsx'))
const StudentExamsPage = lazy(() => import('./views/student/StudentExamsPage.jsx'))
const StudentPerformancePage = lazy(() => import('./views/student/StudentPerformancePage.jsx'))
const StudentReportsPage = lazy(() => import('./views/student/StudentReportsPage.jsx'))

const TeacherCreateExamPage = lazy(() => import('./views/teacher/TeacherCreateExamPage.jsx'))
const TeacherDashboardPage = lazy(() => import('./views/teacher/TeacherDashboardPage.jsx'))
const TeacherDetectionsPage = lazy(() => import('./views/teacher/TeacherDetectionsPage.jsx'))
const TeacherActivityLogsPage = lazy(() => import('./views/teacher/TeacherActivityLogsPage.jsx'))
const TeacherExamDetailPage = lazy(() => import('./views/teacher/TeacherExamDetailPage.jsx'))
const TeacherMyClassesPage = lazy(() => import('./views/teacher/TeacherMyClassesPage.jsx'))
const TeacherTermClassesPage = lazy(() => import('./views/teacher/TeacherTermClassesPage.jsx'))
const TeacherReportsPage = lazy(() => import('./views/teacher/TeacherReportsPage.jsx'))

const SuperAdminDashboardPage = lazy(() => import('./views/super-admin/SuperAdminDashboardPage.jsx'))
const SuperAdminInstitutionsPage = lazy(() => import('./views/super-admin/SuperAdminInstitutionsPage.jsx'))
const SuperAdminAnalyticsPage = lazy(() => import('./views/super-admin/SuperAdminAnalyticsPage.jsx'))

export default function App() {
  const { authUser, sessionMode, refreshAuth } = useSession()

  const showOnboarding =
    sessionMode === 'auth' &&
    authUser &&
    !authUser.mustChangePassword &&
    (authUser.needsInitialJoin || authUser.needsStudentNumber || authUser.needsJoinClass)

  return (
    <>
    {showOnboarding && (
      <PostOnboardingModal
        authUser={authUser}
        onComplete={async () => {
          window.location.reload()
        }}
      />
    )}
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />
      <Route path="/verify" element={<VerifyEmailPage />} />
      <Route
        path="/dev/portals"
        element={
          <LazyPage>
            <DevPortalsPage />
          </LazyPage>
        }
      />
      <Route
        path="/teacher"
        element={
          <ProtectedRoute portal="teacher">
            <TeacherLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TeacherDashboardPage />} />
        <Route path="create-exam" element={<TeacherCreateExamPage />} />
        <Route path="my-classes" element={<TeacherMyClassesPage />} />
        <Route path="my-classes/section/:sectionId" element={<TeacherTermClassesPage />} />
        <Route path="my-classes/term/:termId" element={<TeacherTermClassesPage />} />
        <Route path="my-classes/:classId" element={<TeacherClassExamsPage />} />
        <Route path="my-classes/:classId/exams/:examId" element={<TeacherExamDetailPage />} />
        <Route path="my-exams" element={<Navigate to="/teacher/my-classes" replace />} />
        <Route path="detections" element={<TeacherDetectionsPage />} />
        <Route path="logs" element={<TeacherActivityLogsPage />} />
        <Route path="reports" element={<TeacherReportsPage />} />
        <Route path="live-monitoring" element={<Navigate to="/teacher/detections" replace />} />
      </Route>
      <Route path="/student/exam/lobby" element={<Navigate to="/student/exam/session" replace />} />
      <Route
        path="/student/exam/session"
        element={
          <LazyPage>
            <StudentExamSessionPage />
          </LazyPage>
        }
      />
      <Route
        path="/student/exam/result"
        element={
          <LazyPage>
            <StudentExamResultPage />
          </LazyPage>
        }
      />
      <Route
        path="/student"
        element={
          <ProtectedRoute portal="student">
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/student/my-classes" replace />} />
        <Route path="join" element={<Navigate to="/student/my-classes" replace />} />
        <Route path="my-classes" element={<StudentExamsPage />} />
        <Route path="my-classes/:classId" element={<StudentClassStreamPage />} />
        <Route path="exams" element={<Navigate to="/student/my-classes" replace />} />
        <Route path="performance" element={<StudentPerformancePage />} />
        <Route path="reports" element={<StudentReportsPage />} />
        <Route path="messages" element={<Navigate to="/student/my-classes" replace />} />
      </Route>
      <Route
        path="/admin"
        element={
          <ProtectedRoute portal="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="students" element={<AdminPlaceholderPage title="Students" />} />
        <Route path="subjects" element={<AdminSubjectsPage />} />
        <Route path="classes" element={<AdminExaminationsPage />} />
        <Route path="examinations" element={<Navigate to="/admin/classes" replace />} />
        <Route path="monitoring" element={<AdminMonitoringPage />} />
        <Route path="violations" element={<AdminViolationsPage />} />
        <Route path="users" element={<AdminUserManagementPage basePath="/admin" />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="settings" element={<AdminSettingsPage basePath="/admin" />} />
      </Route>
      <Route
        path="/super-admin"
        element={
          <ProtectedRoute portal="super_admin">
            <SuperAdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<SuperAdminDashboardPage />} />
        <Route path="students" element={<AdminPlaceholderPage title="Students" />} />
        <Route path="subjects" element={<AdminPlaceholderPage title="Subjects" />} />
        <Route path="institutions" element={<SuperAdminInstitutionsPage />} />
        <Route path="classes" element={<Navigate to="/super-admin/institutions" replace />} />
        <Route path="examinations" element={<Navigate to="/super-admin/institutions" replace />} />
        <Route path="monitoring" element={<AdminPlaceholderPage title="Monitoring" />} />
        <Route path="analytics" element={<SuperAdminAnalyticsPage />} />
        <Route path="violations" element={<Navigate to="/super-admin/analytics" replace />} />
        <Route path="users" element={<AdminUserManagementPage basePath="/super-admin" />} />
        <Route path="reports" element={<AdminPlaceholderPage title="Reports" />} />
        <Route path="settings" element={<AdminSettingsPage basePath="/super-admin" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}
