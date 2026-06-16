import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog.jsx'
import { formatDateCreated } from '@/lib/adminUsersApi.js'
import UserAvatar from '@/components/admin/UserAvatar.jsx'

/**
 * @param {{
 *   open: boolean,
 *   onOpenChange: (open: boolean) => void,
 *   users: object[],
 *   onApprove?: (user: object) => void,
 *   onReject?: (user: object) => void,
 *   approvingUid?: string | null,
 *   rejectingUid?: string | null,
 * }} props
 */
export default function AdminPendingApprovalsModal({
  open,
  onOpenChange,
  users,
  onApprove,
  onReject,
  approvingUid = null,
  rejectingUid = null,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="um-pending-dialog admin-dialog-content" aria-describedby={undefined}>
        <div className="admin-dialog-header">
          <DialogTitle className="admin-dialog-title">Pending faculty approval</DialogTitle>
          <DialogDescription className="admin-dialog-desc">
            These faculty accounts cannot sign in until you approve them. Reject to remove the request.
          </DialogDescription>
        </div>

        <div className="admin-dialog-body">
        {users.length === 0 ? (
          <p className="um-pending-dialog__empty">All caught up — no pending approvals.</p>
        ) : (
          <ul className="um-pending-list">
            {users.map((user) => (
              <li key={user.uid} className="um-pending-item">
                <div className="um-pending-item__main">
                  <UserAvatar user={user} />
                  <div className="um-pending-item__text">
                    <span className="um-pending-item__name">{user.name}</span>
                    <span className="um-pending-item__email">{user.email}</span>
                    {user.dateCreated ? (
                      <span className="um-pending-item__meta">
                        Requested {formatDateCreated(user.dateCreated)}
                      </span>
                    ) : null}
                  </div>
                </div>
                {onApprove || onReject ? (
                  <div className="um-pending-item__actions">
                    {onReject ? (
                      <button
                        type="button"
                        className="btn btn--ghost um-pending-reject"
                        disabled={approvingUid === user.uid || rejectingUid === user.uid}
                        onClick={() => onReject(user)}
                      >
                        {rejectingUid === user.uid ? 'Rejecting…' : 'Reject'}
                      </button>
                    ) : null}
                    {onApprove ? (
                      <button
                        type="button"
                        className="btn btn--compact"
                        disabled={approvingUid === user.uid || rejectingUid === user.uid}
                        onClick={() => onApprove(user)}
                      >
                        {approvingUid === user.uid ? 'Approving…' : 'Approve'}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        </div>

        <div className="admin-dialog-footer">
          <button type="button" className="btn btn--ghost" onClick={() => onOpenChange(false)}>
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
