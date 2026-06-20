import { getPool } from './db.js'

async function checkSlow() {
  const pool = getPool()
  if (!pool) return console.log('no pool')

  const qOpt = `
    WITH stats AS (
      SELECT 
        COUNT(*) AS "totalExams",
        COUNT(*) FILTER (WHERE e.status IN ('open', 'waiting')) AS "ongoingExams"
      FROM exams e
      JOIN classes c ON e.class_id = c.class_id
      WHERE c.institution_id = 1 AND c.is_active = TRUE AND e.is_archived = FALSE
    ),
    detected AS (
      SELECT COUNT(DISTINCT es.session_id) AS "detectedStudents"
      FROM exam_sessions es
      JOIN exams e ON es.exam_id = e.exam_id
      JOIN classes c ON e.class_id = c.class_id
      WHERE c.institution_id = 1 AND c.is_active = TRUE AND es.warning_count > 0
    )
    SELECT stats."totalExams", stats."ongoingExams", detected."detectedStudents"
    FROM stats, detected;
  `
  
  const t0 = Date.now()
  await pool.query(qOpt)
  console.log('Optimized Query took', Date.now() - t0, 'ms')
  
  const qOrig = `
    SELECT
      (SELECT COUNT(*)
       FROM exams e
       JOIN classes c ON e.class_id = c.class_id
       WHERE c.institution_id = 1 AND c.is_active = TRUE
         AND e.is_archived = FALSE AND e.status IN ('open', 'waiting')) AS "ongoingExams",
      (SELECT COUNT(*)
       FROM exams e
       JOIN classes c ON e.class_id = c.class_id
       WHERE c.institution_id = 1 AND c.is_active = TRUE AND e.is_archived = FALSE) AS "totalExams",
      (SELECT COUNT(DISTINCT es.session_id)
       FROM exam_sessions es
       JOIN exams e ON es.exam_id = e.exam_id
       JOIN classes c ON e.class_id = c.class_id
       WHERE c.institution_id = 1 AND c.is_active = TRUE AND es.warning_count > 0) AS "detectedStudents"
  `
  const t1 = Date.now()
  await pool.query(qOrig)
  console.log('Original Query took', Date.now() - t1, 'ms')

  process.exit()
}
checkSlow()
