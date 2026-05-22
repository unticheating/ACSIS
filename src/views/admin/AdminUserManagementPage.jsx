import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
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
import {
  formatSchoolIdInput,
  validateSchoolIdClient,
  validateYearLevelClient,
  YEAR_LEVEL_OPTIONS,
} from '@/lib/userFormConstants.js'
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
  programCode: '',
  yearLevel: '',
  section: '',
  password: '',
  pendingFaculty: false,
}

export default function AdminUserManagementPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState([])
  const [pendingFaculty, setPendingFaculty] = useState(0)
  const [loading, setLoading] = useState(true)
  const [banner, setBanner] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
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
      setBanner(err instanceof Error ? err.message : 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

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

  function openAdd() {
    setForm(emptyForm)
    setAddOpen(true)
  }

  function openEdit(user) {
    setEditingUid(user.uid)
    setForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      middleName: user.middleName || '',
      email: user.email || '',
      role: user.role,
      schoolId: user.schoolId || '',
      programCode: user.programCode || '',
      yearLevel: user.yearLevel || '',
      section: user.section || '',
      password: '',
      pendingFaculty: false,
    })
    setEditOpen(true)
  }

  function patchForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function validateForm() {
    const id = String(form.schoolId || '').trim()
    if (form.role === 'student' || id) {
      const idErr = validateSchoolIdClient(form.schoolId, form.role === 'student')
      if (idErr) return idErr
    }
    if (form.role === 'student') {
      const yearErr = validateYearLevelClient(form.yearLevel, true)
      if (yearErr) return yearErr
    }
    return null
  }

  async function onCreate(e) {
    e.preventDefault()
    const validationError = validateForm()
    if (validationError) {
      setBanner(validationError)
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
        programCode: form.programCode,
        yearLevel: form.yearLevel,
        section: form.section,
        password: form.role === 'admin' ? form.password : undefined,
        pendingFaculty: form.role === 'faculty' && form.pendingFaculty,
      })
      setAddOpen(false)
      await loadUsers()
    } catch (err) {
      setBanner(err instanceof Error ? err.message : 'Failed to create user.')
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
      }
      if (form.role === 'student') {
        payload.programCode = form.programCode
        payload.yearLevel = form.yearLevel
        payload.section = form.section
      }
      await updateAdminUser(editingUid, payload)
      setEditOpen(false)
      setEditingUid(null)
      await loadUsers()
    } catch (err) {
      setBanner(err instanceof Error ? err.message : 'Failed to update user.')
    } finally {
      setSubmitting(false)
    }
  }

  async function onDeactivate(user) {
    if (!window.confirm(`Deactivate ${user.name}? They will not be able to sign in.`)) return
    setBanner(null)
    try {
      await updateAdminUser(user.uid, { deactivate: true })
      await loadUsers()
    } catch (err) {
      setBanner(err instanceof Error ? err.message : 'Failed to deactivate user.')
    }
  }

  async function onApprove(user) {
    if (!window.confirm(`Approve ${user.name}?`)) {
      return
    }
    setBanner(null)
    try {
      await updateAdminUser(user.uid, { approve: true })
      await loadUsers()
    } catch (err) {
      setBanner(err instanceof Error ? err.message : 'Failed to approve user.')
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
          placeholder="name@plpasig.edu.ph"
          value={form.email}
          onChange={(e) => patchForm('email', e.target.value)}
        />
      </label>
      {!editOpen ? (
        <label>
          Role
          <select value={form.role} onChange={(e) => patchForm('role', e.target.value)}>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="admin">Administrator</option>
          </select>
        </label>
      ) : null}
      <label>
        Student / employee ID
        <input
          type="text"
          inputMode="numeric"
          required={form.role === 'student' && !editOpen}
          placeholder="00-00000"
          pattern="\d{2}-\d{5}"
          maxLength={8}
          title="Format: 00-00000"
          value={form.schoolId}
          onChange={(e) => patchForm('schoolId', formatSchoolIdInput(e.target.value))}
        />
        <span className="um-field-hint">Format: 00-00000 (example: 24-00123)</span>
      </label>
      {form.role === 'student' ? (
        <>
          <label>
            Program
            <input
              type="text"
              placeholder="BSIT"
              value={form.programCode}
              onChange={(e) => patchForm('programCode', e.target.value)}
            />
          </label>
          <label>
            Year level
            <select
              required
              value={form.yearLevel}
              onChange={(e) => patchForm('yearLevel', e.target.value)}
            >
              {YEAR_LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value || 'empty'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Section
            <input
              type="text"
              placeholder="3D"
              value={form.section}
              onChange={(e) => patchForm('section', e.target.value)}
            />
          </label>
        </>
      ) : null}
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
          <span className="brand-plp">PLP</span>
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

        <div className="um-topbar">
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
              </button>
            ))}
          </div>
          <div className="um-topbar-right">
            {pendingFaculty > 0 ? (
              <span className="pending-badge">Pending faculty approval ({pendingFaculty})</span>
            ) : null}
            <label className="um-search">
              <Search size={16} strokeWidth={2} aria-hidden />
              <input
                type="search"
                placeholder="Search name, email, or student ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">
              Users
              <span className="violation-count">({filteredUsers.length})</span>
            </span>
            <button type="button" className="btn" onClick={openAdd} disabled={loading}>
              Add user
            </button>
          </div>

          <div className="um-table-wrapper">
            {loading ? (
              <p className="um-loading">Loading users…</p>
            ) : (
              <table className="um-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Student / ID no.</th>
                    <th>Year &amp; section</th>
                    <th>Status</th>
                    <th>Role</th>
                    <th>Date created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="um-empty">
                        No users found. Add a user or adjust your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.uid}>
                        <td className="um-name">{u.name}</td>
                        <td className="um-email">{u.email}</td>
                        <td>{u.schoolId || '—'}</td>
                        <td>
                          {u.yearLevel || u.section ? (
                            <>
                              {u.yearLevel || '—'}
                              {u.yearLevel && u.section ? (
                                <span className="um-meta-sep"> · </span>
                              ) : null}
                              {u.section || ''}
                            </>
                          ) : (
                            <span className="um-muted">—</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`um-status-badge${u.status !== 'active' ? ` um-status-badge--${u.status}` : ''}`}
                          >
                            {statusLabel(u.status)}
                          </span>
                        </td>
                        <td>{roleLabel(u.role)}</td>
                        <td>{formatDateCreated(u.dateCreated)}</td>
                        <td>
                          <div className="um-actions">
                            {u.status === 'pending' ? (
                              <button
                                type="button"
                                className="um-action-link"
                                onClick={() => onApprove(u)}
                              >
                                Approve
                              </button>
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
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="um-dialog">
          <form onSubmit={onCreate}>
            <DialogHeader>
              <DialogTitle>Add user</DialogTitle>
              <DialogDescription>
                Creates a user in PostgreSQL for your institution. Student IDs must be unique.
              </DialogDescription>
            </DialogHeader>
            {formFields}
            <DialogFooter>
              <button type="button" className="btn btn--ghost" onClick={() => setAddOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save user'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="um-dialog">
          <form onSubmit={onSaveEdit}>
            <DialogHeader>
              <DialogTitle>Edit user</DialogTitle>
              <DialogDescription>Update account details. Role changes are not supported here yet.</DialogDescription>
            </DialogHeader>
            {formFields}
            <DialogFooter>
              <button type="button" className="btn btn--ghost" onClick={() => setEditOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save changes'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
