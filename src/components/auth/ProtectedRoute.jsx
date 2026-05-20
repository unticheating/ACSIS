import { Navigate } from 'react-router-dom'
import { useSession } from '@/context/SessionContext.jsx'

/**
 * @param {{ children: import('react').ReactNode, portal?: 'admin' | 'teacher' | 'student' | 'super_admin' }} props
 */
export default function ProtectedRoute({ children, portal }) {
  const { authLoading, isAuthenticated, activeAccount } = useSession()

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8 text-muted-foreground" role="status">
        Loading…
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (portal && activeAccount.portal !== portal) {
    return <Navigate to={activeAccount.entryPath} replace />
  }

  return children
}
