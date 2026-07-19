const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.nfzpkwvkatmcaaubptwi:gJxdMu6nOnQ96hjh@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres'
});
client.connect().then(() => {
  return client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'exams'");
}).then(res => {
  console.log('EXAMS:', res.rows);
  return client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'exam_sessions'");
}).then(res => {
  console.log('EXAM_SESSIONS:', res.rows);
  client.end();
}).catch(console.error);
