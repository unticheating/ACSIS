import StreamBackLink from '@/components/layout/StreamBackLink.jsx'
import '../../styles/acsis-immersive.css'

/**
 * Example in-exam / lobby screen using the shared immersive background.
 * Wire this route when the exam session API is ready.
 */
export default function StudentExamLobbyPage() {
  return (
    <div className="acsis-immersive">
      <div className="acsis-immersive__topbar">
        <span style={{ opacity: 0.8 }}>Student Quiz</span>
        <span className="acsis-immersive__exam-title">BSIT 3D INFOSEC QUIZ #1</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>35:00</span>
      </div>

      <div className="acsis-immersive__body">
        <h2 className="acsis-immersive__warning-title">WARNING:</h2>
        <p className="acsis-immersive__prose">
          This session is monitored. <strong>Tab switching</strong>, <strong>leaving the exam page</strong>,{' '}
          <strong>screenshots</strong>, and <strong>right-clicking</strong> may be logged. Three strikes can end your
          attempt automatically.
        </p>
        <div className="acsis-immersive__status">
          <span className="acsis-immersive__spinner" aria-hidden />
          <span>Waiting for JUANITO ALVAREZ JR to start the exam…</span>
        </div>
        <p style={{ marginTop: 32, fontSize: '0.85rem', opacity: 0.75 }}>
          <StreamBackLink to="/student/my-classes" style={{ color: '#86efac' }}>
            Leave lobby (demo)
          </StreamBackLink>
        </p>
      </div>
    </div>
  )
}
