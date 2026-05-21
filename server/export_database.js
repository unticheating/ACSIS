/**
 * Export the live ACSIS PostgreSQL database to a plain SQL file.
 * Usage: node export_database.js [output-path]
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getPool, isDatabaseEnabled } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

/** Tables in FK-safe insert order */
const TABLE_ORDER = [
  'themes',
  'users',
  'institutions',
  'institution_members',
  'classes',
  'class_enrollments',
  'exams',
  'questions',
  'choices',
  'exam_sessions',
  'student_answers',
  'cheating_logs',
  'exam_results',
  'report_logs',
]

function sqlLiteral(value) {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (value instanceof Date) return `'${value.toISOString().replace(/'/g, "''")}'`
  if (Array.isArray(value)) {
    const inner = value.map((v) => sqlLiteral(v)).join(', ')
    return `ARRAY[${inner}]`
  }
  if (typeof value === 'object') {
    const json = JSON.stringify(value).replace(/'/g, "''")
    return `'${json}'::jsonb`
  }
  return `'${String(value).replace(/'/g, "''")}'`
}

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`
}

async function getColumns(pool, table) {
  const { rows } = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table],
  )
  return rows.map((r) => r.column_name)
}

async function exportTable(pool, table) {
  const columns = await getColumns(pool, table)
  if (!columns.length) return { table, lines: [], count: 0 }

  const colList = columns.map(quoteIdent).join(', ')
  const { rows } = await pool.query(`SELECT * FROM ${quoteIdent(table)}`)
  const lines = []

  for (const row of rows) {
    const values = columns.map((c) => sqlLiteral(row[c])).join(', ')
    lines.push(`INSERT INTO ${quoteIdent(table)} (${colList}) VALUES (${values});`)
  }

  return { table, lines, count: rows.length }
}

async function resetSequences(pool, out) {
  const { rows } = await pool.query(
    `SELECT
       c.relname AS table_name,
       a.attname AS column_name,
       pg_get_serial_sequence(format('%I.%I', n.nspname, c.relname), a.attname) AS seq
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     JOIN pg_attribute a ON a.attrelid = c.oid
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND a.attnum > 0
       AND NOT a.attisdropped
       AND pg_get_serial_sequence(format('%I.%I', n.nspname, c.relname), a.attname) IS NOT NULL`,
  )

  for (const { table_name, column_name, seq } of rows) {
    if (!seq) continue
    out.push(
      `SELECT setval('${seq}', COALESCE((SELECT MAX(${quoteIdent(column_name)}) FROM ${quoteIdent(table_name)}), 1), true);`,
    )
  }
}

async function main() {
  if (!isDatabaseEnabled()) {
    console.error('DATABASE_URL is not set. Add it to .env before exporting.')
    process.exit(1)
  }

  const stamp = new Date().toISOString().slice(0, 10)
  const defaultOut = path.join(ROOT, 'sql', 'exports', `acsis_dump_${stamp}.sql`)
  const outPath = path.resolve(process.argv[2] || defaultOut)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })

  const pool = getPool()
  const lines = [
    '-- ACSIS PostgreSQL export',
    `-- Generated: ${new Date().toISOString()}`,
    '-- Import: see sql/IMPORT_DATABASE.md',
    '',
    'BEGIN;',
    '',
    '-- Clear existing public data (safe on a dev copy of acsis)',
    'TRUNCATE TABLE',
    '  report_logs, exam_results, cheating_logs, student_answers, exam_sessions,',
    '  choices, questions, exams, class_enrollments, classes,',
    '  institution_members, institutions, users, themes',
    'RESTART IDENTITY CASCADE;',
    '',
  ]

  const summary = []

  try {
    const existing = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    )
    const present = new Set(existing.rows.map((r) => r.table_name))

    for (const table of TABLE_ORDER) {
      if (!present.has(table)) continue
      const { lines: inserts, count } = await exportTable(pool, table)
      lines.push(`-- ${table} (${count} rows)`)
      lines.push(...inserts)
      lines.push('')
      summary.push({ table, count })
    }

    lines.push('-- Reset serial sequences')
    await resetSequences(pool, lines)
    lines.push('')
    lines.push('COMMIT;')
    lines.push('')

    fs.writeFileSync(outPath, lines.join('\n'), 'utf8')

    console.log(`Exported to: ${outPath}`)
    console.log('Row counts:')
    for (const { table, count } of summary) {
      console.log(`  ${table}: ${count}`)
    }
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Export failed:', err)
  process.exit(1)
})
