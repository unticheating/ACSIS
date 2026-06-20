import { getPool } from './db.js'

async function addIndex() {
  const pool = getPool()
  if (!pool) return console.log('no pool')
  try {
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_exam_sessions_status_exam_id ON public.exam_sessions USING btree (exam_id, status)`)
    console.log('Index created')
  } catch(e) {
    console.log(e.message)
  }
  process.exit()
}
addIndex()
