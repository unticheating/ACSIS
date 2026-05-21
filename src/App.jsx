import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'
import StudentLayout from './layouts/StudentLayout.jsx'
import SuperAdminLayout from './layouts/SuperAdminLayout.jsx'
import TeacherLayout from './layouts/TeacherLayout.jsx'
import AdminDashboardPage from './views/admin/AdminDashboardPage.jsx'
import AdminExaminationsPage from './views/admin/AdminExaminationsPage.jsx'
import AdminPlaceholderPage from './views/admin/AdminPlaceholderPage.jsx'
import AdminUserManagementPage from './views/admin/AdminUserManagementPage.jsx'
import AdminSettingsPage from './views/admin/AdminSettingsPage.jsx'
import DevPortalsPage from './views/DevPortalsPage.jsx'
import LoginPage from './views/LoginPage.jsx'
import VerifyEmailPage from './views/VerifyEmailPage.jsx'
import StudentClassStreamPage from './views/student/StudentClassStreamPage.jsx'
import StudentExamResultPage from './views/student/StudentExamResultPage.jsx'
import StudentExamSessionPage from './views/student/StudentExamSessionPage.jsx'
import StudentExamsPage from './views/student/StudentExamsPage.jsx'
import StudentPerformancePage from './views/student/StudentPerformancePage.jsx'
import StudentReportsPage from './views/student/StudentReportsPage.jsx'
import TeacherCreateExamPage from './views/teacher/TeacherCreateExamPage.jsx'
import TeacherDashboardPage from './views/teacher/TeacherDashboardPage.jsx'
import TeacherDetectionsPage from './views/teacher/TeacherDetectionsPage.jsx'
import TeacherClassExamsPage from './views/teacher/TeacherClassExamsPage.jsx'
import TeacherExamDetailPage from './views/teacher/TeacherExamDetailPage.jsx'
import TeacherMyClassesPage from './views/teacher/TeacherMyClassesPage.jsx'
import TeacherReportsPage from './views/teacher/TeacherReportsPage.jsx'
import SuperAdminDashboardPage from './views/super-admin/SuperAdminDashboardPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/verify" element={<VerifyEmailPage />} />
      <Route path="/dev/portals" element={<DevPortalsPage />} />
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
        <Route path="my-classes/:classId" element={<TeacherClassExamsPage />} />
        <Route path="my-classes/:classId/exams/:examId" element={<TeacherExamDetailPage />} />
        <Route path="my-exams" element={<Navigate to="/teacher/my-classes" replace />} />
        <Route path="detections" element={<TeacherDetectionsPage />} />
        <Route path="reports" element={<TeacherReportsPage />} />
        <Route path="live-monitoring" element={<Navigate to="/teacher/detections" replace />} />
      </Route>
      <Route path="/student/exam/lobby" element={<Navigate to="/student/exam/session" replace />} />
      <Route path="/student/exam/session" element={<StudentExamSessionPage />} />
      <Route path="/student/exam/result" element={<StudentExamResultPage />} />
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
        <Route path="subjects" element={<AdminPlaceholderPage title="Subjects" />} />
        <Route path="classes" element={<AdminExaminationsPage />} />
        <Route path="examinations" element={<Navigate to="/admin/classes" replace />} />
        <Route path="monitoring" element={<AdminPlaceholderPage title="Monitoring" />} />
        <Route path="violations" element={<AdminPlaceholderPage title="Violation records" />} />
        <Route path="users" element={<AdminUserManagementPage basePath="/admin" />} />
        <Route path="reports" element={<AdminPlaceholderPage title="Reports" />} />
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
        <Route path="institutions" element={<AdminExaminationsPage pageTitle="Institutions" />} />
        <Route path="classes" element={<Navigate to="/super-admin/institutions" replace />} />
        <Route path="examinations" element={<Navigate to="/super-admin/institutions" replace />} />
        <Route path="monitoring" element={<AdminPlaceholderPage title="Monitoring" />} />
        <Route path="analytics" element={<AdminPlaceholderPage title="System Analytics" />} />
        <Route path="violations" element={<Navigate to="/super-admin/analytics" replace />} />
        <Route path="users" element={<AdminUserManagementPage basePath="/super-admin" />} />
        <Route path="reports" element={<AdminPlaceholderPage title="Reports" />} />
        <Route path="settings" element={<AdminSettingsPage basePath="/super-admin" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
