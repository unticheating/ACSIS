import { Navigate } from 'react-router-dom'
import AuthLoadingSkeleton from '@/components/layout/AuthLoadingSkeleton.jsx'
import LazyPage from '@/components/layout/LazyPage.jsx'
import { useSession } from '@/context/SessionContext.jsx'

/**
 * @param {{ children: import('react').ReactNode, portal?: 'admin' | 'teacher' | 'student' | 'super_admin' }} props
 */
export default function ProtectedRoute({ children, portal }) {
  const { authLoading, isAuthenticated, activeAccount, authUser } = useSession()

  if (authLoading) {
    return <AuthLoadingSkeleton />
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (authUser?.mustChangePassword) {
    return <Navigate to="/change-password" replace />
  }

  if (portal && activeAccount.portal !== portal) {
    return <Navigate to={activeAccount.entryPath} replace />
  }

  return <LazyPage>{children}</LazyPage>
}
