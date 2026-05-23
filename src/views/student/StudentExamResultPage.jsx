import { Link, useSearchParams } from 'react-router-dom'
import PlpLogo from '@/components/brand/PlpLogo.jsx'
import { getExamInClass } from '@/lib/classesExams.js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { useDocumentTitle } from '@/hooks/useDocumentTitle.js'
import FadeIn from '@/components/ui/fade-in.jsx'
import '../../styles/acsis-immersive.css'

export default function StudentExamResultPage() {
  const [searchParams] = useSearchParams()
  const classId = searchParams.get('classId') || ''
  const examId = searchParams.get('examId') || ''
  const hit = classId && examId ? getExamInClass(classId, examId) : null
  const title = hit?.exam?.title || 'Examination'
  useDocumentTitle('Exam results')

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
            {title}
          </p>

          <FadeIn delay={0.1}>
            <Card className="border-green-200/40 bg-white/95 text-foreground shadow-md dark:border-green-900/40 dark:bg-card/95">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-green-800 dark:text-green-300">Demo submission</CardTitle>
                <CardDescription>
                  This preview mirrors the teammate result layout: scores will come from the live exam engine when wired.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b border-border pb-2">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-semibold text-green-700 dark:text-green-400">Recorded (demo)</span>
                </div>
                <div className="flex justify-between gap-4 border-b border-border pb-2">
                  <span className="text-muted-foreground">Score</span>
                  <span className="font-semibold">— / —</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Time used</span>
                  <span className="font-mono text-xs tabular-nums">—</span>
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          <p style={{ marginTop: 28, textAlign: 'center', fontSize: '0.875rem' }}>
            {hit ? (
              <Link to={`/student/my-classes/${classId}`} style={{ color: '#86efac' }}>
                ← Back to class stream
              </Link>
            ) : (
              <Link to="/student/my-classes" style={{ color: '#86efac' }}>
                ← Enrolled classes
              </Link>
            )}
          </p>
        </div>
      </main>
    </div>
  )
}
