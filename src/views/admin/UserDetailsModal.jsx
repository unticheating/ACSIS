import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx'
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
 *   onDeactivate?: (user: object) => void,
 * }} props
 */
export default function UserDetailsModal({
  open,
  onOpenChange,
  user,
  onEdit,
  onApprove,
  onDeactivate,
}) {
  if (!user) return null

  const idLabel = schoolIdLabel(user.role)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="um-details-dialog admin-dialog-content" aria-describedby="um-details-desc">
        <DialogHeader className="um-details-dialog__header admin-dialog-header">
          <DialogTitle className="admin-dialog-title">{user.name}</DialogTitle>
          <DialogDescription id="um-details-desc" className="admin-dialog-desc">
            Account information for this user.
          </DialogDescription>
        </DialogHeader>

        <dl className="um-details-list admin-dialog-body">
          <DetailRow label="Full name" value={user.name} />
          <DetailRow label="First name" value={user.firstName} />
          {user.middleName ? <DetailRow label="Middle name" value={user.middleName} /> : null}
          <DetailRow label="Last name" value={user.lastName} />
          <DetailRow label="Email" value={user.email} className="um-details-row--email" />
          <DetailRow
            label={idLabel}
            value={user.schoolId || '—'}
          />
          <DetailRow label="Role" value={roleLabel(user.role)} />
          <DetailRow
            label="Account status"
            value={
              <span
                className={`um-status-badge${user.status !== 'active' ? ` um-status-badge--${user.status}` : ''}`}
              >
                {statusLabel(user.status)}
              </span>
            }
          />
          <DetailRow label="Date created" value={formatDateCreated(user.dateCreated)} />
          <DetailRow label="User ID" value={String(user.uid)} className="um-details-row--meta" />
          {user.memberId != null ? (
            <DetailRow label="Member ID" value={String(user.memberId)} className="um-details-row--meta" />
          ) : null}
          {user.isSuperAdmin ? (
            <DetailRow label="Platform access" value="Super administrator" />
          ) : null}
        </dl>

        <DialogFooter className="um-details-dialog__footer admin-dialog-footer">
          {user.status === 'pending' && onApprove ? (
            <button type="button" className="btn" onClick={() => onApprove(user)}>
              Approve
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
