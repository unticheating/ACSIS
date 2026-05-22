import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { examStatusLabel, fetchAdminClasses } from '@/lib/adminClassesApi.js'
import '../../pages/admin-ui/style.css'

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
          View-only: classes and exams are created and managed by faculty. Use User management for accounts and
          Violation records for proctoring data.
        </p>

        {error ? (
          <p className="um-banner-error" role="alert">
            {error}
          </p>
        ) : null}

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-lg">Classes &amp; exams</CardTitle>
            <CardDescription>All active classes at your institution.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading classes…</p>
            ) : classes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No classes yet. Faculty can create classes from My Classes.</p>
            ) : (
              <div className="flex flex-col gap-6">
                {classes.map((c) => (
                  <Card key={c.id} className="overflow-hidden shadow-sm">
                    <div className="border-b bg-muted/20 px-4 py-3 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-col">
                        <h3 className="font-semibold text-lg text-foreground">{c.name}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge variant="secondary">{c.academicYear}</Badge>
                          <Badge variant="outline">{c.semester}</Badge>
                          <Badge variant="outline">Prof. {c.professorName}</Badge>
                          {c.accessCode ? (
                            <Badge variant="outline" className="font-mono text-xs">
                              Class code {c.accessCode}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      <span className="text-sm font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                        {(c.exams || []).length} exam{(c.exams || []).length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="p-4">
                      {(c.exams || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No exams in this class yet.</p>
                      ) : (
                        <div className="overflow-x-auto rounded-md border border-border">
                          <table className="w-full min-w-[520px] text-left text-sm">
                            <thead className="border-b border-border bg-muted/50">
                              <tr>
                                <th className="px-3 py-2 font-medium">Title</th>
                                <th className="px-3 py-2 font-medium">Exam code</th>
                                <th className="px-3 py-2 font-medium">Questions</th>
                                <th className="px-3 py-2 font-medium">Minutes</th>
                                <th className="px-3 py-2 font-medium">Submitted</th>
                                <th className="px-3 py-2 font-medium">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(c.exams || []).map((ex) => (
                                <tr key={ex.id} className="border-b border-border last:border-0">
                                  <td className="px-3 py-2 font-medium">{ex.title || 'Untitled'}</td>
                                  <td className="px-3 py-2 font-mono text-xs">{ex.code || '—'}</td>
                                  <td className="px-3 py-2">{Number(ex.questionCount || 0)}</td>
                                  <td className="px-3 py-2">{Number(ex.duration || 0)}</td>
                                  <td className="px-3 py-2">
                                    {Number(ex.submittedCount || 0)} / {Number(ex.joinedCount || 0)} joined
                                  </td>
                                  <td className="px-3 py-2">
                                    <Badge variant={(ex.status || '').toLowerCase() === 'open' ? 'default' : 'muted'}>
                                      {examStatusLabel(ex.status)}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
