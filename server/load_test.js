/**
 * ACSIS Concurrent Load Test
 * --------------------------
 * Simulates N students hitting the API simultaneously — no extra tools needed.
 * Run: node load_test.js
 *
 * Edit the CONFIG block below before running.
 */

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const CONFIG = {
  // Your deployed Vercel URL (no trailing slash).
  // Change to http://localhost:3001 to test locally first.
  BASE_URL: 'https://acsis-exam.vercel.app/',

  // Number of simulated concurrent users per round.
  CONCURRENCY: 40,

  // Number of rounds to run (waits for all in a round before starting next).
  ROUNDS: 3,

  // Delay between rounds (ms) — simulates students not all hitting at once.
  ROUND_DELAY_MS: 2000,

  // Optional: a real session cookie from your browser (DevTools → Application → Cookies → token).
  // If set, the DB-hitting /api/auth/me call will be authenticated.
  // Leave empty to test unauthenticated endpoints only.
  SESSION_COOKIE: '',

  // Endpoints to hit on every simulated user request.
  // Each object: { label, path, expectStatus }
  ENDPOINTS: [
    { label: 'health', path: '/api/health', expectStatus: 200 },
    { label: 'auth/me', path: '/api/auth/me', expectStatus: [200, 401] }, // hits DB on every request
  ],
}

// ─────────────────────────────────────────────────────────────────────────────

const results = { pass: 0, fail: 0, times: [] }

function status(code, expected) {
  if (Array.isArray(expected)) return expected.includes(code)
  return code === expected
}

async function hitEndpoint({ label, path, expectStatus }) {
  const url = CONFIG.BASE_URL + path
  const headers = {}
  if (CONFIG.SESSION_COOKIE) headers['Cookie'] = `token=${CONFIG.SESSION_COOKIE}`

  const t0 = Date.now()
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) })
    const ms = Date.now() - t0
    const ok = status(res.status, expectStatus)
    results.times.push(ms)
    if (ok) {
      results.pass++
      return `  ✅ ${label.padEnd(12)} ${res.status}  ${ms}ms`
    } else {
      results.fail++
      return `  ❌ ${label.padEnd(12)} ${res.status}  ${ms}ms  (expected ${expectStatus})`
    }
  } catch (err) {
    const ms = Date.now() - t0
    results.fail++
    return `  💥 ${label.padEnd(12)} ERROR  ${ms}ms  ${err.message}`
  }
}

async function simulateOneUser(userId) {
  const lines = [`[user-${String(userId).padStart(2, '0')}]`]
  for (const ep of CONFIG.ENDPOINTS) {
    lines.push(await hitEndpoint(ep))
  }
  return lines.join('\n')
}

async function runRound(roundNum) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`Round ${roundNum}/${CONFIG.ROUNDS} — ${CONFIG.CONCURRENCY} concurrent users`)
  console.log('─'.repeat(60))

  // Fire all users simultaneously
  const promises = Array.from({ length: CONFIG.CONCURRENCY }, (_, i) =>
    simulateOneUser(i + 1)
  )

  const outputs = await Promise.allSettled(promises)
  for (const r of outputs) {
    if (r.status === 'fulfilled') console.log(r.value)
    else console.log('  💥 Promise rejected:', r.reason)
  }
}

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

async function main() {
  console.log('ACSIS Concurrent Load Test')
  console.log(`Target  : ${CONFIG.BASE_URL}`)
  console.log(`Users   : ${CONFIG.CONCURRENCY} concurrent`)
  console.log(`Rounds  : ${CONFIG.ROUNDS}`)
  console.log(`Auth    : ${CONFIG.SESSION_COOKIE ? 'yes (cookie set)' : 'no (unauthenticated)'}`)

  for (let r = 1; r <= CONFIG.ROUNDS; r++) {
    await runRound(r)
    if (r < CONFIG.ROUNDS) {
      console.log(`\nWaiting ${CONFIG.ROUND_DELAY_MS}ms before next round...`)
      await new Promise((res) => setTimeout(res, CONFIG.ROUND_DELAY_MS))
    }
  }

  const total = results.pass + results.fail
  console.log(`\n${'═'.repeat(60)}`)
  console.log('RESULTS')
  console.log('═'.repeat(60))
  console.log(`Total requests : ${total}`)
  console.log(`Pass           : ${results.pass}  (${((results.pass / total) * 100).toFixed(1)}%)`)
  console.log(`Fail           : ${results.fail}  (${((results.fail / total) * 100).toFixed(1)}%)`)
  if (results.times.length) {
    console.log(`Avg response   : ${(results.times.reduce((a, b) => a + b, 0) / results.times.length).toFixed(0)}ms`)
    console.log(`p50 response   : ${percentile(results.times, 50)}ms`)
    console.log(`p95 response   : ${percentile(results.times, 95)}ms`)
    console.log(`p99 response   : ${percentile(results.times, 99)}ms`)
    console.log(`Max response   : ${Math.max(...results.times)}ms`)
  }
  console.log('═'.repeat(60))

  if (results.fail > 0) {
    console.log('\n⚠️  There were failures — check DB connections in Supabase Dashboard.')
    process.exit(1)
  } else {
    console.log('\n✅ All requests passed!')
  }
}

main().catch(console.error)
