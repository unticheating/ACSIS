import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog.jsx'
import UserAvatar from '@/components/admin/UserAvatar.jsx'
import { formatDateCreated, roleLabel, statusLabel } from '@/lib/adminUsersApi.js'

function schoolIdLabel(role) {
  if (role === 'student') return 'Student number'
  if (role === 'faculty') return 'Employee ID'
  return 'ID number'
}

function DetailRow({ label, value, className = '' }) {
  if (value == null || value === '') return null
  return (
    <div className={`um-details-row${className ? ` ${className}` : ''}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

/**
 * @param {{
 *   open: boolean,
 *   onOpenChange: (open: boolean) => void,
 *   user: object | null,
 *   onEdit?: (user: object) => void,
 *   onApprove?: (user: object) => void,
 *   onReject?: (user: object) => void,
 *   onDeactivate?: (user: object) => void,
 *   approvingUid?: string | null,
 *   rejectingUid?: string | null,
 * }} props
 */
export default function UserDetailsModal({
  open,
  onOpenChange,
  user,
  onEdit,
  onApprove,
  onReject,
  onDeactivate,
  approvingUid = null,
  rejectingUid = null,
}) {
  if (!user) return null

  const idLabel = schoolIdLabel(user.role)
  const pendingBusy = approvingUid === user.uid || rejectingUid === user.uid

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="admin-dialog-content um-details-dialog" aria-describedby={undefined}>
        <div className="admin-dialog-header um-details-dialog__header">
          <div className="um-details-hero">
            <UserAvatar user={user} size="lg" />
            <div>
              <DialogTitle className="admin-dialog-title">{user.name}</DialogTitle>
              <DialogDescription className="admin-dialog-desc">
                Account details for this institution member.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="admin-dialog-body">
          <div className="um-details-badges">
            <span className={`um-role-badge um-role-badge--${user.role}`}>
              {roleLabel(user.role)}
            </span>
            <span
              className={`um-status-badge${user.status !== 'active' ? ` um-status-badge--${user.status}` : ''}`}
            >
              {statusLabel(user.status)}
            </span>
          </div>

          <dl className="um-details-list">
            <DetailRow label="Full name" value={user.name} />
            <DetailRow label="First name" value={user.firstName} />
            {user.middleName ? <DetailRow label="Middle name" value={user.middleName} /> : null}
            <DetailRow label="Last name" value={user.lastName} />
            <DetailRow label="Email" value={user.email} className="um-details-row--email" />
            {user.role === 'student' ? (
              <DetailRow label={idLabel} value={user.schoolId || '—'} />
            ) : user.schoolId ? (
              <DetailRow label={idLabel} value={user.schoolId} />
            ) : null}
            <DetailRow label="Date created" value={formatDateCreated(user.dateCreated)} />
            <DetailRow label="User ID" value={String(user.uid)} className="um-details-row--meta" />
            {user.memberId != null ? (
              <DetailRow label="Member ID" value={String(user.memberId)} className="um-details-row--meta" />
            ) : null}
            {user.isSuperAdmin ? (
              <DetailRow label="Platform access" value="Super administrator" />
            ) : null}
          </dl>
        </div>

        <div className="admin-dialog-footer um-details-dialog__footer">
          {user.status === 'pending' && onReject ? (
            <button
              type="button"
              className="btn btn--ghost um-details-reject"
              disabled={pendingBusy}
              onClick={() => onReject(user)}
            >
              {rejectingUid === user.uid ? 'Rejecting…' : 'Reject'}
            </button>
          ) : null}
          {user.status === 'pending' && onApprove ? (
            <button type="button" className="btn" disabled={pendingBusy} onClick={() => onApprove(user)}>
              {approvingUid === user.uid ? 'Approving…' : 'Approve'}
            </button>
          ) : null}
          {onEdit ? (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                onEdit(user)
                onOpenChange(false)
              }}
            >
              Edit
            </button>
          ) : null}
          {user.status === 'active' && onDeactivate ? (
            <button
              type="button"
              className="btn btn--ghost um-details-deactivate"
              onClick={() => onDeactivate(user)}
            >
              Deactivate
            </button>
          ) : null}
          <button type="button" className="btn btn--ghost" onClick={() => onOpenChange(false)}>
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
