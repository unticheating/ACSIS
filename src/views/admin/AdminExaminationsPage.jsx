import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge.jsx'
import { fetchAdminClasses } from '@/lib/adminClassesApi.js'
import FadeIn from '@/components/ui/fade-in.jsx'
import { acsisToastError } from '@/lib/acsisToast.js'
import { useInstitutionTheme } from '@/context/InstitutionThemeContext.jsx'
import '../../pages/admin-ui/style.css'

function ClassCard({ classItem, delay = 0 }) {
  const examCount = (classItem.exams || []).length

  return (
    <FadeIn delay={delay} className="class-card panel" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
      <div style={{ marginBottom: '14px' }}>
        <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--brand-page, #1a2e22)', marginBottom: '6px', lineHeight: 1.3 }}>
          {classItem.name}
        </h3>
        <p style={{ fontSize: '13px', color: '#64748b' }}>Prof. {classItem.professorName}</p>
      </div>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px', flex: 1, alignContent: 'flex-start' }}>
        <Badge variant="secondary" style={{ fontSize: '11.5px', fontWeight: 500 }}>{classItem.academicYear}</Badge>
        <Badge variant="outline" style={{ fontSize: '11.5px', fontWeight: 500 }}>{classItem.semester}</Badge>
        {classItem.accessCode ? (
          <Badge variant="outline" className="font-mono" style={{ fontSize: '11.5px', letterSpacing: '0.05em', fontWeight: 500 }}>
            {classItem.accessCode}
          </Badge>
        ) : null}
      </div>

      <div style={{ paddingTop: '14px', borderTop: '1px solid var(--acsis-sidebar-border, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <span style={{ fontSize: '13.5px', color: '#475569', fontWeight: 500 }}>
          {examCount} exam{examCount !== 1 ? 's' : ''}
        </span>
        <button type="button" className="view-btn">View class</button>
      </div>
    </FadeIn>
  )
}

export default function AdminExaminationsPage({ pageTitle = 'Classes' }) {
  const { acronym } = useInstitutionTheme()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadClasses = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdminClasses()
      setClasses(data)
    } catch (err) {
      setClasses([])
      const msg = err instanceof Error ? err.message : 'Failed to load classes.'
      setError(msg)
      acsisToastError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadClasses()
  }, [loadClasses])

  return (
    <div className="acsis-stack">
      <div className="content-header">
        <div className="breadcrumb">
          <span className="brand-plp">{acronym || 'PLP'}</span>
          <span className="brand-acsis"> ACSIS</span>
          <span className="sep">/</span>
          <span className="page-name">{pageTitle}</span>
        </div>
      </div>

      <div className="content-body">
        {error ? (
          <p className="um-banner-error" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground mb-4">Loading classes…</p>
        ) : classes.length === 0 ? (
          <p className="admin-placeholder-lead">
            No classes yet. Faculty can create classes from My Classes.
          </p>
        ) : (
          <div className="admin-class-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px',
            alignItems: 'stretch'
          }}>
            {classes.map((c, index) => (
              <ClassCard key={c.id} classItem={c} delay={index * 0.05} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
