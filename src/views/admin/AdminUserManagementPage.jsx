import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search, UserPlus, UserX, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog.jsx'
import {
  createAdminUser,
  fetchAdminUsers,
  formatDateCreated,
  roleLabel,
  statusLabel,
  updateAdminUser,
} from '@/lib/adminUsersApi.js'
import { formatSchoolIdInput, validateSchoolIdClient } from '@/lib/userFormConstants.js'
import { acsisToastError, acsisToastSuccess } from '@/lib/acsisToast.js'
import { useAcsisConfirm } from '@/hooks/useAcsisConfirm.jsx'
import FadeIn from '@/components/ui/fade-in.jsx'
import UserAvatar from '@/components/admin/UserAvatar.jsx'
import UserDetailsModal from '@/views/admin/UserDetailsModal.jsx'
import AdminPendingApprovalsModal from '@/views/admin/AdminPendingApprovalsModal.jsx'
import { useInstitutionTheme } from '@/context/InstitutionThemeContext.jsx'
import '../../pages/admin-ui/style.css'

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'student', label: 'Students' },
  { id: 'faculty', label: 'Faculty' },
  { id: 'admin', label: 'Administrators' },
]

const emptyForm = {
  firstName: '',
  lastName: '',
  middleName: '',
  email: '',
  role: 'student',
  schoolId: '',
  password: '',
  pendingFaculty: false,
  isSuperAdmin: false,
}

export default function AdminUserManagementPage() {
  const { acronym, institution } = useInstitutionTheme()
  const studentEmailDomain = institution.emailDomain || 'plpasig.edu.ph'
  const { confirm, ConfirmDialog } = useAcsisConfirm()
  const [activeTab, setActiveTab] = useState('all')
  const [pendingOpen, setPendingOpen] = useState(false)
  const [approvingUid, setApprovingUid] = useState(null)
  const [rejectingUid, setRejectingUid] = useState(null)
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState([])
  const [pendingFaculty, setPendingFaculty] = useState(0)
  const [loading, setLoading] = useState(true)
  const [banner, setBanner] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editingUid, setEditingUid] = useState(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setBanner(null)
    try {
      const data = await fetchAdminUsers()
      setUsers(data.users || [])
      setPendingFaculty(data.pendingFaculty ?? 0)
    } catch (err) {
      setUsers([])
      const msg = err instanceof Error ? err.message : 'Failed to load users.'
      setBanner(msg)
      acsisToastError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const tabCounts = useMemo(() => {
    const counts = { all: users.length, student: 0, faculty: 0, admin: 0 }
    for (const u of users) {
      if (u.role in counts) counts[u.role] += 1
    }
    return counts
  }, [users])

  const pendingUsers = useMemo(
    () => users.filter((u) => u.role === 'faculty' && u.status === 'pending'),
    [users],
  )

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
      if (activeTab !== 'all' && u.role !== activeTab) return false
      if (!q) return true
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        String(u.schoolId || '').toLowerCase().includes(q)
      )
    })
  }, [activeTab, search, users])

  const showStudentNumber = activeTab === 'student'
  const tableColSpan = showStudentNumber ? 7 : 6

  function openAdd() {
    setForm(emptyForm)
    setAddOpen(true)
  }

  function openDetails(user) {
    setSelectedUser(user)
    setDetailsOpen(true)
  }

  function openEdit(user) {
    setDetailsOpen(false)
    setEditingUid(user.uid)
    setForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      middleName: user.middleName || '',
      email: user.email || '',
      role: user.role,
      schoolId: user.schoolId || '',
      password: '',
      pendingFaculty: false,
      isSuperAdmin: Boolean(user.isSuperAdmin),
    })
    setEditOpen(true)
  }

  function patchForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function validateForm() {
    const id = String(form.schoolId || '').trim()
    if (form.role === 'student' || id) {
      const idErr = validateSchoolIdClient(form.schoolId, form.role === 'student', form.role)
      if (idErr) return idErr
    }
    return null
  }

  async function onCreate(e) {
    e.preventDefault()
    const validationError = validateForm()
    if (validationError) {
      setBanner(validationError)
      acsisToastError(validationError)
      return
    }
    setSubmitting(true)
    setBanner(null)
    try {
      await createAdminUser({
        firstName: form.firstName,
        lastName: form.lastName,
        middleName: form.middleName || null,
        email: form.email,
        role: form.role,
        schoolId: form.schoolId,
        password: form.role === 'admin' ? form.password : undefined,
        pendingFaculty: form.role === 'faculty' && form.pendingFaculty,
      })
      setAddOpen(false)
      acsisToastSuccess('User created.')
      await loadUsers()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create user.'
      setBanner(msg)
      acsisToastError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function onSaveEdit(e) {
    e.preventDefault()
    if (!editingUid) return
    const validationError = validateForm()
    if (validationError) {
      setBanner(validationError)
      acsisToastError(validationError)
      return
    }
    setSubmitting(true)
    setBanner(null)
    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        middleName: form.middleName || null,
        email: form.email,
        schoolId: form.schoolId,
        role: form.role,
      }
      await updateAdminUser(editingUid, payload)
      setEditOpen(false)
      setEditingUid(null)
      acsisToastSuccess('User updated.')
      await loadUsers()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update user.'
      setBanner(msg)
      acsisToastError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function onDeactivate(user) {
    const ok = await confirm({
      title: `Deactivate ${user.name}?`,
      description: 'They will not be able to sign in.',
      confirmLabel: 'Deactivate',
      destructive: true,
    })
    if (!ok) return
    setBanner(null)
    try {
      await updateAdminUser(user.uid, { deactivate: true })
      acsisToastSuccess(`${user.name} deactivated.`)
      await loadUsers()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to deactivate user.'
      setBanner(msg)
      acsisToastError(msg)
    }
  }

  async function onReject(user) {
    const ok = await confirm({
      title: `Reject ${user.name}?`,
      description:
        'Their faculty request will be removed. They can submit a new request later if needed.',
      confirmLabel: 'Reject',
      destructive: true,
    })
    if (!ok) return
    setBanner(null)
    setRejectingUid(user.uid)
    try {
      await updateAdminUser(user.uid, { reject: true })
      acsisToastSuccess(`${user.name}'s request was rejected.`)
      if (selectedUser?.uid === user.uid) {
        setDetailsOpen(false)
        setSelectedUser(null)
      }
      await loadUsers()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reject request.'
      setBanner(msg)
      acsisToastError(msg)
    } finally {
      setRejectingUid(null)
    }
  }

  async function onApprove(user) {
    const ok = await confirm({
      title: `Approve ${user.name}?`,
      description: 'They will be able to sign in as faculty.',
      confirmLabel: 'Approve',
    })
    if (!ok) return
    setBanner(null)
    setApprovingUid(user.uid)
    try {
      await updateAdminUser(user.uid, { approve: true })
      acsisToastSuccess(`${user.name} approved.`)
      await loadUsers()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to approve user.'
      setBanner(msg)
      acsisToastError(msg)
    } finally {
      setApprovingUid(null)
    }
  }

  const formFields = (
    <div className="um-form-grid">
      <label>
        First name
        <input
          type="text"
          required
          value={form.firstName}
          onChange={(e) => patchForm('firstName', e.target.value)}
        />
      </label>
      <label>
        Last name
        <input
          type="text"
          required
          value={form.lastName}
          onChange={(e) => patchForm('lastName', e.target.value)}
        />
      </label>
      <label className="um-form-full">
        Middle name <span className="um-optional">(optional)</span>
        <input
          type="text"
          value={form.middleName}
          onChange={(e) => patchForm('middleName', e.target.value)}
        />
      </label>
      <label className="um-form-full">
        Email
        <input
          type="email"
          required
          placeholder={
            form.role === 'student'
              ? `name@${studentEmailDomain}`
              : 'name@gmail.com or name@school.edu'
          }
          value={form.email}
          onChange={(e) => patchForm('email', e.target.value)}
        />
        {form.role === 'student' ? (
          <span className="um-field-hint">Must use @{studentEmailDomain}</span>
        ) : form.role === 'admin' ? (
          <span className="um-field-hint">
            Institution admins may use school or personal email. They sign in with the address and
            password you set here (or Google if that same email is on their Google account).
          </span>
        ) : (
          <span className="um-field-hint">
            Part-time faculty may use personal or school email. They must sign in with the same
            address you enter here.
          </span>
        )}
      </label>
      <label>
        Role
        {form.isSuperAdmin ? (
          <input type="text" readOnly value={roleLabel(form.role)} />
        ) : (
          <select value={form.role} onChange={(e) => patchForm('role', e.target.value)}>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="admin">Administrator</option>
          </select>
        )}
      </label>
      {form.role === 'student' ? (
        <label>
          Student number
          <input
            type="text"
            inputMode="numeric"
            required
            placeholder="00-00000"
            pattern="\\d{2}-\\d{5}"
            maxLength={8}
            title="Format: 00-00000"
            value={form.schoolId}
            onChange={(e) => patchForm('schoolId', formatSchoolIdInput(e.target.value))}
          />
          <span className="um-field-hint">Format: 00-00000 (example: 24-00123)</span>
        </label>
      ) : (
        <label>
          Employee ID
          <input
            type="text"
            placeholder="e.g. FAC-2019-0142"
            maxLength={50}
            title="Institution employee ID"
            value={form.schoolId}
            onChange={(e) => patchForm('schoolId', e.target.value.slice(0, 50))}
          />
          <span className="um-field-hint">Optional. Use your institution employee ID (not a student number).</span>
        </label>
      )}
      {!editOpen && form.role === 'admin' ? (
        <label className="um-form-full">
          Password <span className="um-optional">(for email login)</span>
          <input
            type="password"
            value={form.password}
            onChange={(e) => patchForm('password', e.target.value)}
            autoComplete="new-password"
          />
        </label>
      ) : null}
      {!editOpen && form.role === 'faculty' ? (
        <label className="um-form-full um-form-check">
          <input
            type="checkbox"
            checked={form.pendingFaculty}
            onChange={(e) => patchForm('pendingFaculty', e.target.checked)}
          />
          Require approval before faculty can sign in
        </label>
      ) : null}
    </div>
  )

  return (
    <div className="acsis-stack">
      <div className="content-header">
        <div className="breadcrumb">
          <span className="brand-plp">{acronym || 'PLP'}</span>
          <span className="brand-acsis"> ACSIS</span>
          <span className="sep">/</span>
          <span className="page-name">User management</span>
        </div>
      </div>

      <div className="content-body">
        {banner ? (
          <p className="um-banner-error" role="alert">
            {banner}
          </p>
        ) : null}

        <FadeIn delay={0.05} className="um-controls-row">
          <div className="um-tabs" role="tablist" aria-label="Filter users by role">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`um-tab${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                <span className="um-tab-count">{loading ? '…' : tabCounts[tab.id]}</span>
              </button>
            ))}
          </div>
          <div className="um-controls-end">
            {pendingFaculty > 0 ? (
              <button
                type="button"
                className="um-pending-alert"
                onClick={() => setPendingOpen(true)}
              >
                {pendingFaculty} pending approval
              </button>
            ) : null}
            <label className="um-search">
              <Search size={16} strokeWidth={2} aria-hidden />
              <input
                type="search"
                placeholder="Search name, email, or ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search users"
              />
              {search ? (
                <button
                  type="button"
                  className="um-search-clear"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >
                  <X size={14} strokeWidth={2} aria-hidden />
                </button>
              ) : null}
            </label>
          </div>
        </FadeIn>

        <FadeIn delay={0.1} className="panel">
          <div className="panel-header panel-header--split">
            <span className="panel-title">
              Users
              <span className="violation-count">({loading ? '…' : filteredUsers.length})</span>
            </span>
            <div className="um-panel-actions">
              <button
                type="button"
                className="btn btn--ghost um-refresh-btn"
                onClick={loadUsers}
                disabled={loading}
                aria-label="Refresh user list"
              >
                <RefreshCw size={15} strokeWidth={2} className={loading ? 'um-spin' : undefined} aria-hidden />
                Refresh
              </button>
              <button type="button" className="btn" onClick={openAdd} disabled={loading}>
                <UserPlus size={16} strokeWidth={2} aria-hidden />
                Add user
              </button>
            </div>
          </div>

          <div className="um-table-wrapper">
            {loading ? (
              <table className="um-table" aria-hidden>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    {showStudentNumber ? <th>Student no.</th> : null}
                    <th>Status</th>
                    <th className="um-col-hide-md">Role</th>
                    <th className="um-col-hide-lg">Date created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 6 }, (_, i) => (
                    <tr key={i} className="um-skeleton-row">
                      <td>
                        <div className="um-user-cell">
                          <span className="um-avatar" style={{ background: '#e5e7eb', color: 'transparent' }} />
                          <span className="um-skeleton um-skeleton--name" />
                        </div>
                      </td>
                      <td><span className="um-skeleton um-skeleton--email" /></td>
                      {showStudentNumber ? (
                        <td><span className="um-skeleton um-skeleton--short" /></td>
                      ) : null}
                      <td><span className="um-skeleton um-skeleton--badge" /></td>
                      <td className="um-col-hide-md"><span className="um-skeleton um-skeleton--badge" /></td>
                      <td className="um-col-hide-lg"><span className="um-skeleton um-skeleton--short" /></td>
                      <td><span className="um-skeleton um-skeleton--actions" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <>
                <p id="um-table-hint" className="um-sr-only">
                  Select a user row to view account details. Tab to a row, then press Enter or Space.
                </p>
                <table className="um-table" aria-describedby="um-table-hint">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    {showStudentNumber ? <th>Student no.</th> : null}
                    <th>Status</th>
                    <th className="um-col-hide-md">Role</th>
                    <th className="um-col-hide-lg">Date created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={tableColSpan}>
                        <div className="um-empty-state">
                          <div className="um-empty-state__icon" aria-hidden>
                            <UserX size={28} strokeWidth={1.5} />
                          </div>
                          <p className="um-empty-state__title">No users match your filters</p>
                          <p className="um-empty-state__desc">
                            {search || activeTab !== 'all'
                              ? 'Try clearing search or switching to a different role tab.'
                              : 'Get started by adding your first institution account.'}
                          </p>
                          {!search && activeTab === 'all' ? (
                            <button type="button" className="btn" onClick={openAdd}>
                              <UserPlus size={16} strokeWidth={2} aria-hidden />
                              Add user
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn--ghost"
                              onClick={() => {
                                setSearch('')
                                setActiveTab('all')
                              }}
                            >
                              Clear filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, index) => (
                      <FadeIn
                        as="tr"
                        key={u.uid}
                        delay={0.15 + (index * 0.05)}
                        className={`um-table-row um-table-row--clickable${
                          detailsOpen && selectedUser?.uid === u.uid ? ' um-table-row--selected' : ''
                        }`}
                        role="button"
                        tabIndex={0}
                        aria-label={`View details for ${u.name}`}
                        onClick={() => openDetails(u)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            openDetails(u)
                          }
                        }}
                      >
                        <td>
                          <div className="um-user-cell">
                            <UserAvatar user={u} />
                            <span className="um-name">{u.name}</span>
                          </div>
                        </td>
                        <td className="um-email">{u.email}</td>
                        {showStudentNumber ? <td>{u.schoolId || '—'}</td> : null}
                        <td>
                          <span
                            className={`um-status-badge${u.status !== 'active' ? ` um-status-badge--${u.status}` : ''}`}
                          >
                            {statusLabel(u.status)}
                          </span>
                        </td>
                        <td className="um-col-hide-md">
                          <span className={`um-role-badge um-role-badge--${u.role}`}>
                            {roleLabel(u.role)}
                          </span>
                        </td>
                        <td className="um-col-hide-lg um-muted">{formatDateCreated(u.dateCreated)}</td>
                        <td>
                          <div
                            className="um-actions"
                            role="presentation"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          >
                            {u.status === 'pending' ? (
                              <>
                                <button
                                  type="button"
                                  className="um-action-link"
                                  disabled={approvingUid === u.uid || rejectingUid === u.uid}
                                  onClick={() => onApprove(u)}
                                >
                                  {approvingUid === u.uid ? 'Approving…' : 'Approve'}
                                </button>
                                <button
                                  type="button"
                                  className="um-action-link um-action-link--danger"
                                  disabled={approvingUid === u.uid || rejectingUid === u.uid}
                                  onClick={() => onReject(u)}
                                >
                                  {rejectingUid === u.uid ? 'Rejecting…' : 'Reject'}
                                </button>
                              </>
                            ) : null}
                            <button
                              type="button"
                              className="um-action-link"
                              onClick={() => openEdit(u)}
                            >
                              Edit
                            </button>
                            {u.status === 'active' ? (
                              <button
                                type="button"
                                className="um-action-link um-action-link--muted"
                                onClick={() => onDeactivate(u)}
                              >
                                Deactivate
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </FadeIn>
                    ))
                  )}
                </tbody>
              </table>
              </>
            )}
          </div>
        </FadeIn>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="admin-dialog-content um-user-form-dialog" aria-describedby={undefined}>
          <form onSubmit={onCreate}>
            <div className="admin-dialog-header">
              <DialogTitle className="admin-dialog-title">Add user</DialogTitle>
              <DialogDescription className="admin-dialog-desc">
                Creates a user for your institution. Student numbers must be unique.
              </DialogDescription>
            </div>
            <div className="admin-dialog-body">{formFields}</div>
            <div className="admin-dialog-footer">
              <button type="button" className="btn btn--ghost" onClick={() => setAddOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save user'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AdminPendingApprovalsModal
        open={pendingOpen}
        onOpenChange={setPendingOpen}
        users={pendingUsers}
        onApprove={onApprove}
        onReject={onReject}
        approvingUid={approvingUid}
        rejectingUid={rejectingUid}
      />

      <UserDetailsModal
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        user={selectedUser}
        onEdit={openEdit}
        onApprove={onApprove}
        onReject={onReject}
        onDeactivate={onDeactivate}
        approvingUid={approvingUid}
        rejectingUid={rejectingUid}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="admin-dialog-content um-user-form-dialog" aria-describedby={undefined}>
          <form onSubmit={onSaveEdit}>
            <div className="admin-dialog-header">
              <DialogTitle className="admin-dialog-title">Edit user</DialogTitle>
              <DialogDescription className="admin-dialog-desc">
                Update account details, role, and institution ID fields.
              </DialogDescription>
            </div>
            <div className="admin-dialog-body">{formFields}</div>
            <div className="admin-dialog-footer">
              <button type="button" className="btn btn--ghost" onClick={() => setEditOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {ConfirmDialog}
    </div>
  )
}
