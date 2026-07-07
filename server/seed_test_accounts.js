import bcrypt from 'bcrypt';
import { getPool } from './db.js';

async function seedPasswords() {
  const pool = getPool();
  try {
    const hash = await bcrypt.hash('password123', 12);
    
    // Update Admin (1), Teacher (888), Student (999) to have passwords
    await pool.query('UPDATE users SET password = $1 WHERE uid IN (1, 888, 999)', [hash]);
    
    console.log('✅ Passwords updated! You can now log in normally.');
    console.log('--- Accounts ---');
    console.log('Accounts updated for admin, teacher, and student IDs.');
  } catch (err) {
    console.error('Failed:', err.message);
  } finally {
    await pool.end();
  }
}

seedPasswords();
