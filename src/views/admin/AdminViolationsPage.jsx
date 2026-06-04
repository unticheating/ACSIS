import { useCallback, useEffect, useState } from 'react'
import {
  fetchAdminViolationDetail,
  fetchAdminViolations,
  formatViolationDate,
  formatViolationDateTime,
  violationStatusClass,
} from '@/lib/adminViolationsApi.js'
import { acsisToastError } from '@/lib/acsisToast.js'
import FadeIn from '@/components/ui/fade-in.jsx'
import { Download } from 'lucide-react'
import { useInstitutionTheme } from '@/context/InstitutionThemeContext.jsx'
import ViolationDetailModal from '@/views/admin/ViolationDetailModal.jsx'
import '../../pages/admin-ui/style.css'

function exportViolationsCsv(violations) {
  const headers = ['Student', 'Exam', 'Date', 'Strikes', 'Status']
  const rows = violations.map(v => [
    `"${v.student}"`,
    `"${v.exam}"`,
    `"${formatViolationDate(v.date)}"`,
    v.strikes,
    `"${v.status}"`
  ])
  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', `ticketed-violations-${new Date().toISOString().split('T')[0]}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export default function AdminViolationsPage() {
  const { acronym } = useInstitutionTheme()
  const [violations, setViolations] = useState([])
  const [count, setCount] = useState(0)
  const [maxWarnings, setMaxWarnings] = useState(3)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(null)
  const [detail, setDetail] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdminViolations()
      // Filter for ticketed violations
      const ticketedViolations = (data.violations || []).filter(v => v.status && v.status.toLowerCase() === 'ticketed')
      setViolations(ticketedViolations)
      setCount(ticketedViolations.length)
      setMaxWarnings(data.maxWarnings ?? 3)
    } catch (err) {
      setViolations([])
      const msg = err instanceof Error ? err.message : 'Failed to load violations.'
      setError(msg)
      acsisToastError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function viewViolation(sessionId) {
    setDetailOpen(true)
    setDetailLoading(true)
    setDetailError(null)
    setDetail(null)
    try {
      const data = await fetchAdminViolationDetail(sessionId)
      setDetail(data.detail)
      if (data.maxWarnings != null) setMaxWarnings(data.maxWarnings)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load session detail.'
      setDetailError(msg)
      acsisToastError(msg)
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDetail() {
    setDetailOpen(false)
    setDetail(null)
    setDetailError(null)
  }

  return (
    <div className="acsis-stack">
      <div className="content-header">
        <div className="breadcrumb">
          <span className="brand-plp">{acronym || 'PLP'}</span>
          <span className="brand-acsis"> ACSIS</span>
          <span className="sep">/</span>
          <span className="page-name">Ticketed records</span>
        </div>
      </div>

      <div className="content-body">
        {error ? (
          <p className="um-banner-error" role="alert">
            {error}
          </p>
        ) : null}

        <FadeIn delay={0.1} className="panel">
          <div className="panel-header panel-header--split">
            <span className="panel-title">
              Ticketed violations
              <span className="violation-count">({loading ? '…' : count})</span>
            </span>
            <button
              type="button"
              className="btn btn--outline btn--compact"
              onClick={() => exportViolationsCsv(violations)}
              disabled={loading || violations.length === 0}
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>

          {loading ? (
            <p className="um-loading">Loading violation records…</p>
          ) : violations.length === 0 ? (
            <p className="admin-placeholder-lead">No ticketed violations recorded yet.</p>
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Strikes</th>
                    <th>Student</th>
                    <th>Exam</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="admin-table__actions">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {violations.map((v, index) => (
                    <FadeIn key={v.id} as="tr" delay={0.15 + (index * 0.05)}>
                      <td className="admin-table__strikes">{v.strikes}</td>
                      <td className="admin-table__student">{v.student}</td>
                      <td>{v.exam}</td>
                      <td>{formatViolationDate(v.date)}</td>
                      <td>
                        <span className={`violation-status-badge vstatus-${violationStatusClass(v.status)}`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="admin-table__actions">
                        <button type="button" className="view-btn" onClick={() => viewViolation(v.id)}>
                          View Receipt
                        </button>
                      </td>
                    </FadeIn>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </FadeIn>
      </div>

      <ViolationDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        loading={detailLoading}
        error={detailError}
        detail={detail}
        maxWarnings={maxWarnings}
      />
    </div>
  )
}
