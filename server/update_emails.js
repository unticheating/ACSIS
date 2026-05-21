import { getPool } from './db.js';

async function updateEmails() {
  const pool = getPool();
  try {
    await pool.query("UPDATE users SET email = 'teacher@plpasig.edu.ph' WHERE uid = 888");
    await pool.query("UPDATE users SET email = 'student@plpasig.edu.ph' WHERE uid = 999");
    console.log('✅ Emails updated successfully in the database.');
  } catch (err) {
    console.error('Failed to update emails:', err.message);
  } finally {
    await pool.end();
  }
}

updateEmails();
