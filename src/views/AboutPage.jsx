import { Link } from 'react-router-dom'
import AuthImmersiveShell from '@/components/auth/AuthImmersiveShell.jsx'
import AuthLoginFooter from '@/components/auth/AuthLoginFooter.jsx'
import { useDocumentTitle } from '@/hooks/useDocumentTitle.js'
import '../styles/acsis-immersive.css'

export default function AboutPage() {
  useDocumentTitle('About ACSIS')

  return (
    <AuthImmersiveShell>
      <div className="acsis-immersive__auth-stack">
        <article className="acsis-immersive__auth-card acsis-immersive__about-card">
          <h2 className="acsis-immersive__about-title">About ACSIS</h2>
          <p className="acsis-immersive__about-lead">
            ACSIS (Anti-Cheating Student Integrity System) is an online examination platform for
            Pamantasan ng Lungsod ng Pasig.
          </p>
          <div className="acsis-immersive__about-section">
            <h3>Who it is for</h3>
            <p>
              Faculty and students participating in the pilot use ACSIS to run exams, monitor sessions,
              and review integrity reports during scheduled assessments.
            </p>
          </div>
          <div className="acsis-immersive__about-section">
            <h3>Sign-in</h3>
            <p>
              Use your school Google account or your ACSIS-registered email. Google sign-in continues on
              Google&apos;s own page at{' '}
              <span className="acsis-immersive__about-mono">accounts.google.com</span> with your
              @plpasig.edu.ph account.
            </p>
          </div>
          <div className="acsis-immersive__about-section">
            <h3>Integrity monitoring</h3>
            <p>
              During an exam, ACSIS may log focus changes and other proctoring signals so instructors can
              review activity fairly. Warnings and violation logs are visible to authorized staff only.
            </p>
          </div>
          <p className="acsis-immersive__about-back">
            <Link to="/">← Back to sign in</Link>
          </p>
        </article>
        <AuthLoginFooter />
      </div>
    </AuthImmersiveShell>
  )
}
