import { useEffect, useState } from 'react'
import StreamBackLink from '@/components/layout/StreamBackLink.jsx'
import PlpLogo from '@/components/brand/PlpLogo.jsx'
import { fetchStudentExamSession } from '@/lib/studentExamApi.js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { useDocumentTitle } from '@/hooks/useDocumentTitle.js'
import FadeIn from '@/components/ui/fade-in.jsx'
import '../../styles/acsis-immersive.css'

export default function StudentExamResultPage() {
  const [searchParams] = useSearchParams()
  const classId = searchParams.get('classId') || ''
  const examId = searchParams.get('examId') || ''
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [examTitle, setExamTitle] = useState('Examination')
  const [result, setResult] = useState(null)
  const [scorePending, setScorePending] = useState(false)

  useDocumentTitle('Exam results')

  useEffect(() => {
    if (!classId || !examId) {
      setLoading(false)
      setError('Missing class or exam.')
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchStudentExamSession(classId, examId)
        if (cancelled) return
        setExamTitle(data.exam?.title || 'Examination')
        if (data.result) {
          setResult(data.result)
          setScorePending(false)
        } else if (data.scorePending) {
          setScorePending(true)
        } else if (data.sessionStatus !== 'submitted') {
          setError('This exam has not been submitted yet.')
        } else {
          setScorePending(true)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load results.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [classId, examId])

  return (
    <div className="acsis-immersive">
      <header className="acsis-immersive__institution">
        <div className="acsis-immersive__logo-mark" aria-hidden>
          <PlpLogo className="acsis-logo-img" width={28} height={28} alt="" />
        </div>
        <span>ACSIS</span>
      </header>

      <main className="acsis-immersive__main">
        <div className="acsis-immersive__panel" style={{ maxWidth: 560, textAlign: 'left' }}>
          <h1 className="acsis-immersive__title" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}>
            Results
          </h1>
          <p className="acsis-immersive__subtitle" style={{ marginBottom: 24 }}>
            {examTitle}
          </p>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading results…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : (
            <FadeIn delay={0.1}>
              <Card className="border-green-200/40 bg-white/95 text-foreground shadow-md dark:border-green-900/40 dark:bg-card/95">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-green-800 dark:text-green-300">
                    {scorePending ? 'Submitted' : 'Your score'}
                  </CardTitle>
                  <CardDescription>
                    {scorePending
                      ? 'Your instructor has not released scores yet. Check Performance later.'
                      : 'Scores are shown after your instructor releases them.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4 border-b border-border pb-2">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-semibold text-green-700 dark:text-green-400">Submitted</span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-border pb-2">
                    <span className="text-muted-foreground">Score</span>
                    <span className="font-semibold">
                      {result
                        ? `${result.rawScore} / ${result.totalPoints} (${result.percentage}%)`
                        : scorePending
                          ? 'Pending release'
                          : '—'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          )}

          <p style={{ marginTop: 28, textAlign: 'center', fontSize: '0.875rem' }}>
            {classId ? (
              <StreamBackLink to={`/student/my-classes/${classId}`} style={{ color: '#86efac' }}>
                Back to class stream
              </StreamBackLink>
            ) : (
              <StreamBackLink to="/student/my-classes" style={{ color: '#86efac' }}>
                Enrolled classes
              </StreamBackLink>
            )}
          </p>
        </div>
      </main>
    </div>
  )
}
