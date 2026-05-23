import { useCallback, useEffect, useState } from 'react'
import { SummaryStatCard, SummaryStatGrid } from '@/components/dashboard/SummaryStatCard.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { fetchStudentPerformance } from '@/lib/studentPerformanceApi.js'
import { acsisToastError } from '@/lib/acsisToast.js'
import FadeIn from '@/components/ui/fade-in.jsx'

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return '—'
  }
}

export default function StudentPerformancePage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchStudentPerformance()
      setData(result)
    } catch (err) {
      setData(null)
      const msg = err instanceof Error ? err.message : 'Failed to load performance.'
      setError(msg)
      acsisToastError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const submitted = (data?.attempts || []).filter((a) => a.status === 'submitted')

  return (
    <div className="acsis-view space-y-6">
      <FadeIn delay={0.05}>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Performance</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Your exam scores and submissions from enrolled classes.
        </p>
      </FadeIn>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <FadeIn delay={0.1}>
        <SummaryStatGrid>
          <SummaryStatCard
            label="Average score"
            value={data?.averagePercentage != null ? `${data.averagePercentage}%` : '—'}
            hint={submitted.length ? `From ${submitted.length} submitted exam(s)` : 'No graded attempts yet.'}
            tone="success"
          />
          <SummaryStatCard label="Exams completed" value={data?.examsCompleted ?? 0} tone="success" />
          <SummaryStatCard label="Integrity warnings" value={data?.totalWarnings ?? 0} tone="danger" />
        </SummaryStatGrid>
      </FadeIn>

      <FadeIn delay={0.15}>
        <Card>
          <CardHeader>
          <CardTitle>Exam history</CardTitle>
          <CardDescription>Submitted and in-progress attempts.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !data?.attempts?.length ? (
            <p className="text-sm text-muted-foreground">No exam attempts yet. Join a class exam and submit your answers.</p>
          ) : (
            <ul className="space-y-3">
              {data.attempts.map((a, index) => (
                <FadeIn
                  as="li"
                  delay={0.2 + (index * 0.05)}
                  key={a.sessionId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="font-medium text-foreground">{a.examTitle}</p>
                    <p className="text-xs text-muted-foreground">{a.className}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant={a.status === 'submitted' ? 'default' : 'secondary'}>{a.status}</Badge>
                    {a.status === 'submitted' && a.percentage != null ? (
                      <span className="font-semibold text-primary">
                        {a.percentage}% ({a.rawScore}/{a.totalPoints})
                      </span>
                    ) : null}
                    <span className="text-muted-foreground text-xs">{formatDate(a.submittedAt)}</span>
                  </div>
                </FadeIn>
              ))}
            </ul>
          )}
        </CardContent>
        </Card>
      </FadeIn>
    </div>
  )
}
