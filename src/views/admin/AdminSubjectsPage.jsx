import '../../pages/admin-ui/style.css'

/** ACSIS groups courses by class — there is no separate subjects table in the schema. */
export default function AdminSubjectsPage() {
  return (
    <div className="acsis-stack">
      <div className="content-header">
        <div className="breadcrumb">
          <span className="brand-plp">PLP</span>
          <span className="brand-acsis"> ACSIS</span>
          <span className="sep">/</span>
          <span className="page-name">Subjects</span>
        </div>
      </div>
      <div className="content-body">
        <p className="admin-placeholder-lead">
          ACSIS does not use a separate subjects table. Course groupings are managed as{' '}
          <strong>classes</strong> (with academic year and semester). Use Classes to view examinations
          per cohort, or User management for student accounts.
        </p>
      </div>
    </div>
  )
}
