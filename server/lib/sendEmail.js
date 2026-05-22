import nodemailer from 'nodemailer'
import { config } from '../config.js'

let transporter = null

export function isSmtpConfigured() {
  return Boolean(config.smtp.host && config.smtp.user && config.smtp.pass)
}

function getTransporter() {
  if (transporter) return transporter
  if (!isSmtpConfigured()) return null

  const isGmail = config.smtp.host.includes('gmail')
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    requireTLS: isGmail && !config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  })
  return transporter
}

/** Log whether real email delivery is available (call once on server start). */
export async function logSmtpStatus() {
  if (!isSmtpConfigured()) {
    console.warn(
      '  Email OTP: SMTP not configured — codes print in this terminal only.',
    )
    console.warn(
      '  Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env (project root), then restart dev:api.',
    )
    return
  }

  try {
    const transport = getTransporter()
    await transport.verify()
    console.log(`  Email OTP: SMTP ready (${config.smtp.host} → sends as ${config.smtp.user})`)
  } catch (err) {
    console.error('  Email OTP: SMTP configured but connection failed:', err.message)
    console.error('  For Gmail use an App Password: https://myaccount.google.com/apppasswords')
  }
}

/**
 * @param {string} to
 * @param {string} code
 */
export async function sendVerificationEmail(to, code) {
  const subject = 'Your ACSIS verification code'
  const text = `Your ACSIS verification code is: ${code}\n\nThis code expires in 15 minutes. If you did not sign in, ignore this email.`
  const html = `
    <p>Your ACSIS verification code is:</p>
    <p style="font-size:28px;font-weight:bold;letter-spacing:0.2em">${code}</p>
    <p>This code expires in 15 minutes. If you did not sign in to ACSIS, you can ignore this email.</p>
  `

  const transport = getTransporter()
  if (!transport) {
    console.log(`[ACSIS] Verification code for ${to}: ${code}`)
    return { sent: false, devLogged: true }
  }

  try {
    await transport.sendMail({
      from: config.smtp.from,
      to,
      subject,
      text,
      html,
    })
    console.log(`[ACSIS] Verification email sent to ${to}`)
    return { sent: true, devLogged: false }
  } catch (err) {
    console.error(`[ACSIS] Failed to send email to ${to}:`, err.message)
    console.log(`[ACSIS] Verification code for ${to}: ${code}`)
    return { sent: false, devLogged: true, error: err.message }
  }
}
