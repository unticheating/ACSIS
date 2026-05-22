import { useCallback, useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { examStatusLabel, fetchAdminClasses } from '@/lib/adminClassesApi.js'
import '../../pages/admin-ui/style.css'

function ExamRow({ exam }) {
  const [open, setOpen] = useState(false)
  const title = exam.title || 'Untitled exam'

  return (
    <div className={`admin-exam-row${open ? ' admin-exam-row--open' : ''}`}>
      <button
        type="button"
        className="admin-exam-row__trigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="admin-exam-row__title">{title}</span>
        <ChevronDown className="admin-exam-row__chevron" aria-hidden />
      </button>
      {open ? (
        <dl className="admin-exam-row__detail">
          <div>
            <dt>Exam code</dt>
            <dd className="font-mono text-xs">{exam.code || '—'}</dd>
          </div>
          <div>
            <dt>Questions</dt>
            <dd>{Number(exam.questionCount || 0)}</dd>
          </div>
          <div>
            <dt>Time limit</dt>
            <dd>{Number(exam.duration || 0)} min</dd>
          </div>
          <div>
            <dt>Submitted</dt>
            <dd>
              {Number(exam.submittedCount || 0)} / {Number(exam.joinedCount || 0)} joined
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <Badge variant={(exam.status || '').toLowerCase() === 'open' ? 'default' : 'muted'}>
                {examStatusLabel(exam.status)}
              </Badge>
            </dd>
          </div>
        </dl>
      ) : null}
    </div>
  )
}

function ClassRow({ classItem }) {
  const [open, setOpen] = useState(false)
  const exams = classItem.exams || []
  const examCount = exams.length

  return (
    <div className={`admin-class-row${open ? ' admin-class-row--open' : ''}`}>
      <button
        type="button"
        className="admin-class-row__trigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="admin-class-row__title">{classItem.name}</span>
        <span className="admin-class-row__meta">
          <span className="admin-class-row__count">
            {examCount} exam{examCount === 1 ? '' : 's'}
          </span>
          <ChevronDown className="admin-class-row__chevron" aria-hidden />
        </span>
      </button>
      {open ? (
        <div className="admin-class-row__body">
          <div className="admin-class-row__badges">
            <Badge variant="secondary">{classItem.academicYear}</Badge>
            <Badge variant="outline">{classItem.semester}</Badge>
            <Badge variant="outline">Prof. {classItem.professorName}</Badge>
            {classItem.accessCode ? (
              <Badge variant="outline" className="font-mono text-xs">
                Class code {classItem.accessCode}
              </Badge>
            ) : null}
          </div>
          {examCount === 0 ? (
            <p className="text-sm text-muted-foreground">No exams in this class yet.</p>
          ) : (
            <div className="admin-exam-list">
              {exams.map((ex) => (
                <ExamRow key={ex.id} exam={ex} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default function AdminExaminationsPage({ pageTitle = 'Classes' }) {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchClasses = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdminClasses()
      setClasses(data)
    } catch (err) {
      setClasses([])
      setError(err instanceof Error ? err.message : 'Failed to load classes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  return (
    <div className="acsis-stack">
      <div className="content-header">
        <div className="breadcrumb">
          <span className="brand-plp">PLP</span>
          <span className="brand-acsis"> ACSIS</span>
          <span className="sep">/</span>
          <span className="page-name">{pageTitle}</span>
        </div>
      </div>

      <div className="content-body">
        <p className="text-sm text-muted-foreground mb-4 w-full">
          View-only: click a class or exam title to expand details. Faculty manage content from My Classes.
        </p>

        {error ? (
          <p className="um-banner-error" role="alert">
            {error}
          </p>
        ) : null}

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-lg">Classes &amp; exams</CardTitle>
            <CardDescription>Tap a row to see class info and exam details.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading classes…</p>
            ) : classes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No classes yet. Faculty can create classes from My Classes.</p>
            ) : (
              <div className="admin-class-list">
                {classes.map((c) => (
                  <ClassRow key={c.id} classItem={c} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
