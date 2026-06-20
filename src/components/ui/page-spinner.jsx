/**
 * PageSpinner — matches the audit-log inline loading style.
 * Usage: <PageSpinner label="Loading exams…" />
 */
export default function PageSpinner({ label = 'Loading…', className = '' }) {
  return (
    <div className={`acsis-page-spinner ${className}`} role="status" aria-label={label}>
      <div className="acsis-page-spinner__ring" aria-hidden="true" />
      <span className="acsis-page-spinner__label">{label}</span>
    </div>
  )
}
