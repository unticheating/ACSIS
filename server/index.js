import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { assertAuthConfig, config } from './config.js'
import authRouter from './routes/auth.js'
import adminUsersRouter from './routes/adminUsers.js'

try {
  if (config.google.clientId && config.google.clientSecret) {
    assertAuthConfig()
  }
} catch (err) {
  console.warn(String(err))
}

const app = express()

app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  }),
)
app.use(cookieParser())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/auth', authRouter)
app.use('/api/admin/users', adminUsersRouter)

app.listen(config.port, () => {
  console.log(`ACSIS auth API listening on http://localhost:${config.port}`)
  console.log(`  Frontend: ${config.frontendUrl}`)
  console.log(`  Google callback: ${config.google.callbackUrl}`)
  console.log(`  Allowed email domain: @${config.allowedEmailDomain}`)
  if (!config.databaseUrl) {
    console.warn('  DATABASE_URL not set — password login uses ADMIN_DEV_* from .env')
  } else {
    console.log('  Database: connected via DATABASE_URL (ADMIN_DEV_* is ignored for login)')
  }
})
