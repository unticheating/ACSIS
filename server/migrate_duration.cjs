const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.nfzpkwvkatmcaaubptwi:gJxdMu6nOnQ96hjh@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres'
});

async function migrate() {
  try {
    await client.connect();
    console.log("Connected to DB.");

    await client.query("ALTER TABLE exams ADD COLUMN duration INT DEFAULT 60;");
    console.log("Added duration column.");

    await client.query("UPDATE exams SET duration = GREATEST(1, EXTRACT(EPOCH FROM (scheduled_end - scheduled_start)) / 60) WHERE scheduled_end IS NOT NULL AND scheduled_start IS NOT NULL;");
    console.log("Backfilled duration data.");

    await client.query("ALTER TABLE exams DROP COLUMN scheduled_end;");
    console.log("Dropped scheduled_end column.");

    console.log("Migration successful.");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await client.end();
  }
}

migrate();
