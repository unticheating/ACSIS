import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { logoutAuth } from '@/lib/authApi.js'
import './PostOnboardingModal.css'

export default function PendingFacultyModal({ authUser, onLogout }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const institutionName = authUser?.pendingInstitutionName || 'your institution'

  async function handleSignOut() {
    try {
      await logoutAuth()
    } catch {
      /* ignore */
    }
    if (onLogout) onLogout()
  }

  return createPortal(
    <div className="shadcn-dialog-overlay" role="dialog" aria-modal="true">
      <div className="shadcn-dialog-content">
        <div className="shadcn-dialog-header">
          <h2 className="shadcn-dialog-title">Faculty approval pending</h2>
          <p className="shadcn-dialog-description">
            Your request to join <strong>{institutionName}</strong> as faculty is waiting for administrator
            approval. You will be able to sign in once an admin activates your account.
          </p>
        </div>
        <div className="shadcn-dialog-footer">
          <button type="button" className="shadcn-btn shadcn-btn-primary" onClick={() => void handleSignOut()}>
            Sign out
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
