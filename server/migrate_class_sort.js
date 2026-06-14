import { getPool } from './db.js';

async function migrate() {
  const pool = getPool();
  if (!pool) {
    console.error('Database is not configured.');
    process.exit(1);
  }

  try {
    await pool.query('BEGIN');
    
    // Add sort_order column to class_enrollments
    await pool.query(`
      ALTER TABLE class_enrollments
      ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
    `);

    await pool.query('COMMIT');
    console.log('Successfully added sort_order to class_enrollments.');
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrate();
