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

/**
 * @param {string} to
 * @param {string} temporaryPassword
 */
export async function sendTemporaryPasswordEmail(to, temporaryPassword) {
  const subject = 'Your ACSIS temporary password'
  const text = `Your ACSIS temporary password is: ${temporaryPassword}\n\nUse this temporary password to sign in to ACSIS.`
  const html = `
    <p>Your ACSIS temporary password is:</p>
    <p style="font-size:28px;font-weight:bold;letter-spacing:0.12em">${temporaryPassword}</p>
    <p>Use this temporary password to sign in to ACSIS.</p>
  `

  const transport = getTransporter()
  if (!transport) {
    console.log(`[ACSIS] Temporary password for ${to}: ${temporaryPassword}`)
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
    console.log(`[ACSIS] Temporary password email sent to ${to}`)
    return { sent: true, devLogged: false }
  } catch (err) {
    console.error(`[ACSIS] Failed to send temporary password email to ${to}:`, err.message)
    console.log(`[ACSIS] Temporary password for ${to}: ${temporaryPassword}`)
    return { sent: false, devLogged: true, error: err.message }
  }
}

/**
 * @param {{
 *   to: string,
 *   studentName: string,
 *   examTitle: string,
 *   rawScore: number,
 *   totalPoints: number,
 *   percentage: number,
 *   answerKey?: Array<{ question: string, correctAnswer?: string, type?: string }> | null,
 *   teacherName?: string,
 *   teacherAvatarUrl?: string | null,
 * }} params
 */
export async function sendExamResultEmail({
  to,
  studentName,
  examTitle,
  rawScore,
  totalPoints,
  percentage,
  answerKey = null,
  teacherName = 'ACSIS',
  teacherAvatarUrl = null,
}) {
  const senderEmailMatch = config.smtp.from.match(/<([^>]+)>/)
  const senderEmail = senderEmailMatch ? senderEmailMatch[1] : config.smtp.from
  const fromField = teacherName !== 'ACSIS' ? `"${teacherName} via ACSIS" <${senderEmail}>` : config.smtp.from

  const subject = `ACSIS exam result: ${examTitle}`
  const scoreLine = `Score: ${rawScore} / ${totalPoints} (${percentage}%)`
  let text = `Hello ${studentName},\n\nYour exam "${examTitle}" has been graded by ${teacherName}.\n${scoreLine}\n`
  let html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  `

  if (teacherAvatarUrl) {
    html += `<div style="margin-bottom: 20px;"><img src="${teacherAvatarUrl}" alt="${teacherName} Profile Picture" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;" /></div>`
  }

  html += `
    <p>Hello ${studentName},</p>
    <p>Your exam <strong>${examTitle}</strong> has been graded by ${teacherName}.</p>
    <p><strong>${scoreLine}</strong></p>
  `

  if (answerKey?.length) {
    text += '\nAnswer key:\n'
    html += '<h3 style="font-size:14px;margin-top:16px">Answer key</h3><ol>'
    for (const q of answerKey) {
      const ans = q.correctAnswer || '—'
      text += `\n- ${q.question}: ${ans}`
      html += `<li><strong>${q.question}</strong><br/>${ans}</li>`
    }
    html += '</ol>'
  }

  text += `\n— ${teacherName}`

  html += `<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">`
  html += `<p><em>Sent by ${teacherName} via ACSIS</em></p>`
  html += `</div></div>`

  const transport = getTransporter()
  if (!transport) {
    console.log(`[ACSIS] Exam result for ${to}: ${scoreLine}`)
    return { sent: false, devLogged: true }
  }

  try {
    await transport.sendMail({
      from: fromField,
      to,
      subject,
      text,
      html,
    })
    console.log(`[ACSIS] Exam result email sent to ${to}`)
    return { sent: true, devLogged: false }
  } catch (err) {
    console.error(`[ACSIS] Failed to send exam result to ${to}:`, err.message)
    console.log(`[ACSIS] Exam result for ${to}: ${scoreLine}`)
    return { sent: false, devLogged: true, error: err.message }
  }
}

/**
 * @param {{
 *   to: string,
 *   studentName: string,
 *   examTitle: string,
 *   institutionName: string,
 *   institutionLogo: string | null,
 *   scheduledStart: string | Date | null,
 *   scheduledEnd: string | Date | null,
 * }} params
 */
export async function sendUpcomingExamEmail({
  to,
  studentName,
  examTitle,
  institutionName,
  institutionLogo,
  scheduledStart,
  scheduledEnd,
}) {
  const subject = `Upcoming Exam: ${examTitle}`
  let text = `Hello ${studentName},\n\nYou have an upcoming exam: "${examTitle}".\n`
  if (scheduledStart) text += `Starts: ${new Date(scheduledStart).toLocaleString()}\n`
  if (scheduledEnd) text += `Ends: ${new Date(scheduledEnd).toLocaleString()}\n`
  text += '\n— ACSIS'

  let html = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">`
  
  if (institutionLogo) {
    html += `<div style="text-align: center; margin-bottom: 20px;"><img src="${institutionLogo}" alt="${institutionName} Logo" style="max-height: 80px;" /></div>`
  }
  
  html += `<h2 style="text-align: center; color: #1a56db;">${institutionName}</h2>`
  html += `<p>Hello ${studentName},</p>`
  html += `<p>You have an upcoming exam: <strong>${examTitle}</strong>.</p>`
  
  if (scheduledStart || scheduledEnd) {
    html += `<ul style="list-style: none; padding: 0;">`
    if (scheduledStart) html += `<li><strong>Starts:</strong> ${new Date(scheduledStart).toLocaleString()}</li>`
    if (scheduledEnd) html += `<li><strong>Ends:</strong> ${new Date(scheduledEnd).toLocaleString()}</li>`
    html += `</ul>`
  }

  html += `<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #888;">`
  html += `<p><em>via ACSIS</em></p>`
  // Display ACSIS text as a fallback logo
  html += `<p style="font-weight: bold; font-size: 16px; letter-spacing: 2px; color: #1a56db;">ACSIS</p>`
  html += `</div></div>`

  const transport = getTransporter()
  if (!transport) {
    console.log(`[ACSIS] Upcoming exam email for ${to}: ${examTitle}`)
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
    console.log(`[ACSIS] Upcoming exam email sent to ${to}`)
    return { sent: true, devLogged: false }
  } catch (err) {
    console.error(`[ACSIS] Failed to send upcoming exam email to ${to}:`, err.message)
    return { sent: false, devLogged: true, error: err.message }
  }
}
