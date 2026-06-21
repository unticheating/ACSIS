import { getPool } from '../db.js'

let ensuredPromise = null

export function ensureExamSessionTicketColumns() {
  if (!ensuredPromise) {
    ensuredPromise = (async () => {
      try {
        const pool = getPool()
        await pool.query(`
          ALTER TABLE exam_sessions
            ADD COLUMN IF NOT EXISTS ticket_issued_at TIMESTAMPTZ DEFAULT NULL
        `)
        await pool.query(`
          ALTER TABLE exam_sessions
            ADD COLUMN IF NOT EXISTS ticket_issued_by INT DEFAULT NULL
            REFERENCES institution_members (member_id) ON DELETE SET NULL
        `)
      } catch (err) {
        ensuredPromise = null
        throw err
      }
    })();
  }
  return ensuredPromise
}
