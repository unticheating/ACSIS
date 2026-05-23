import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { assertAuthConfig, config } from './config.js'
import authRouter from './routes/auth.js'
import adminUsersRouter from './routes/adminUsers.js'
import adminClassesRouter from './routes/adminClasses.js'
import adminSettingsRouter from './routes/adminSettings.js'
import adminDashboardRouter from './routes/adminDashboard.js'
import adminViolationsRouter from './routes/adminViolations.js'
import adminMonitoringRouter from './routes/adminMonitoring.js'
import adminReportsRouter from './routes/adminReports.js'
import superAdminInstitutionsRouter from './routes/superAdminInstitutions.js'
import teacherClassesRouter from './routes/teacherClasses.js'
import teacherTermsRouter from './routes/teacherTerms.js'
import studentRouter from './routes/student.js'
import { logSmtpStatus } from './lib/sendEmail.js'
import { ensurePasswordResetSchema } from './lib/ensurePasswordResetSchema.js'

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
app.use(express.json({ limit: '3mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/auth', authRouter)
app.use('/api/admin/users', adminUsersRouter)
app.use('/api/admin/classes', adminClassesRouter)
app.use('/api/admin/settings', adminSettingsRouter)
app.use('/api/admin/dashboard', adminDashboardRouter)
app.use('/api/admin/violations', adminViolationsRouter)
app.use('/api/admin/monitoring', adminMonitoringRouter)
app.use('/api/admin/reports', adminReportsRouter)
app.use('/api/super-admin/institutions', superAdminInstitutionsRouter)
app.use('/api/teacher/terms', teacherTermsRouter)
app.use('/api/teacher/classes', teacherClassesRouter)
app.use('/api/student', studentRouter)

app.listen(config.port, async () => {
  if (config.databaseUrl) {
    try {
      await ensurePasswordResetSchema()
    } catch (err) {
      console.warn('  Password reset schema check failed:', err.message)
    }
  }
  console.log(`ACSIS auth API listening on http://localhost:${config.port}`)
  console.log(`  Frontend: ${config.frontendUrl}`)
  console.log(`  Google callback: ${config.google.callbackUrl}`)
  console.log(`  Allowed email domain: @${config.allowedEmailDomain}`)
  if (!config.databaseUrl) {
    console.warn('  DATABASE_URL not set — password login uses ADMIN_DEV_* from .env')
  } else {
    console.log('  Database: connected via DATABASE_URL (ADMIN_DEV_* is ignored for login)')
  }
  if (!config.emailVerificationEnabled) {
    console.warn(
      '  Email OTP: disabled (EMAIL_VERIFICATION_ENABLED=false or dev default) — sign-in skips /verify',
    )
  } else {
    await logSmtpStatus()
  }
})
