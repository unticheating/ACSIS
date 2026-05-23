import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { fetchAdminUsers, formatDateCreated, statusLabel } from '@/lib/adminUsersApi.js'
import { acsisToastError } from '@/lib/acsisToast.js'
import '../../pages/admin-ui/style.css'

export default function AdminStudentsPage() {
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdminUsers()
      setStudents((data.users || []).filter((u) => u.role === 'student'))
    } catch (err) {
      setStudents([])
      const msg = err instanceof Error ? err.message : 'Failed to load students.'
      setError(msg)
      acsisToastError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        String(s.schoolId || '').toLowerCase().includes(q),
    )
  }, [search, students])

  return (
    <div className="acsis-stack">
      <div className="content-header">
        <div className="breadcrumb">
          <span className="brand-plp">PLP</span>
          <span className="brand-acsis"> ACSIS</span>
          <span className="sep">/</span>
          <span className="page-name">Students</span>
        </div>
      </div>

      <div className="content-body">
        {error ? (
          <p className="um-banner-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="um-topbar">
          <p className="admin-settings-lead" style={{ margin: 0 }}>
            Institution students from the database. Add or edit accounts under User management.
          </p>
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

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">
              Students
              <span className="violation-count">({filtered.length})</span>
            </span>
          </div>
          <div className="um-table-wrapper">
            {loading ? (
              <p className="um-loading">Loading students…</p>
            ) : (
              <table className="um-table">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Date created</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="um-empty">
                        No students found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((s) => (
                      <tr key={s.uid}>
                        <td>{s.schoolId || '—'}</td>
                        <td className="um-name">{s.name}</td>
                        <td className="um-email">{s.email}</td>
                        <td>
                          <span
                            className={`um-status-badge${s.status !== 'active' ? ` um-status-badge--${s.status}` : ''}`}
                          >
                            {statusLabel(s.status)}
                          </span>
                        </td>
                        <td>{formatDateCreated(s.dateCreated)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
