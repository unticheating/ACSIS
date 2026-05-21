import { getPool } from './db.js';

async function seed() {
  const pool = getPool();
  try {
    // 1. Ensure theme and institution exist
    await pool.query(`INSERT INTO themes (theme_id, theme_name, primary_color, secondary_color, base_color) VALUES (1, 'Emerald', '#16A34A', '#DDEEE4', '#FFFFFF') ON CONFLICT DO NOTHING`);
    
    // Create a dummy user for the institution creator
    await pool.query(`INSERT INTO users (uid, first_name, last_name, email, is_super_admin) VALUES (1, 'Admin', 'User', 'admin@plpasig.edu.ph', true) ON CONFLICT (uid) DO NOTHING`);
    
    await pool.query(`INSERT INTO institutions (institution_id, institution_name, acronym, theme_id, created_by) VALUES (1, 'Pamantasan ng Lungsod ng Pasig', 'PLP', 1, 1) ON CONFLICT DO NOTHING`);

    // 2. Create the demo student user and member (ID 999)
    await pool.query(`INSERT INTO users (uid, first_name, last_name, email) VALUES (999, 'Demo', 'Student', 'student@plpasig.edu.ph') ON CONFLICT (uid) DO NOTHING`);
    await pool.query(`INSERT INTO institution_members (member_id, institution_id, uid, role, is_active) VALUES (999, 1, 999, 'student', true) ON CONFLICT DO NOTHING`);

    // 3. Create a demo teacher user and member (ID 888)
    await pool.query(`INSERT INTO users (uid, first_name, last_name, email) VALUES (888, 'Demo', 'Teacher', 'teacher@plpasig.edu.ph') ON CONFLICT (uid) DO NOTHING`);
    await pool.query(`INSERT INTO institution_members (member_id, institution_id, uid, role, is_active) VALUES (888, 1, 888, 'faculty', true) ON CONFLICT DO NOTHING`);

    // 4. Create a default class "PLP-DEFAULT"
    await pool.query(`
      INSERT INTO classes (class_id, institution_id, member_id, class_name, school_year, semester, access_code, is_active)
      VALUES (1, 1, 888, 'Information Assurance and Security', '2024-2025', '1st', 'PLP-DEFAULT', true)
      ON CONFLICT DO NOTHING
    `);

    console.log("Seeding complete! You can now enroll using access code 'PLP-DEFAULT'");
  } catch (err) {
    console.error("Seeding failed:", err.message);
  } finally {
    await pool.end();
  }
}

seed();
