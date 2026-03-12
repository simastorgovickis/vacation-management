import { Resend } from 'resend'
import { logger } from './logger'

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev'
const appBaseUrl =
  process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'

const resend = resendApiKey ? new Resend(resendApiKey) : null

async function safeSendEmail(args: { to: string; subject: string; text: string }) {
  if (!resend) {
    logger.warn('Email not sent: RESEND_API_KEY is not configured', {
      to: args.to,
      subject: args.subject,
    })
    return
  }

  try {
    await resend.emails.send({
      from: fromEmail,
      to: args.to,
      subject: args.subject,
      text: args.text,
    })
  } catch (error) {
    logger.error('Failed to send email', { error, to: args.to, subject: args.subject })
  }
}

// Legacy helper used by token-based reset flow (keep behavior but send via Resend now)
export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  logger.info('Password reset email requested', { email })

  await safeSendEmail({
    to: email,
    subject: 'Password Reset Request',
    text: `You requested a password reset.\n\nClick here to reset your password:\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
  })

  return { success: true }
}

export async function sendManagerNewVacationRequestEmail(params: {
  managerEmail: string
  managerName?: string | null
  employeeName: string
  startDate: string
  endDate: string
  comment?: string | null
}) {
  const { managerEmail, managerName, employeeName, startDate, endDate, comment } = params
  const subject = `New vacation request from ${employeeName}`
  const dashboardUrl = `${appBaseUrl}/manager`
  const textLines = [
    managerName ? `Hi ${managerName},` : 'Hi,',
    '',
    `A new vacation request has been submitted by ${employeeName}.`,
    '',
    `Dates: ${startDate} → ${endDate}`,
  ]
  if (comment) {
    textLines.push('', `Comment: ${comment}`)
  }
  textLines.push('', `You can review this request in the Manager Dashboard:`, dashboardUrl)

  const text = textLines.join('\n')
  await safeSendEmail({ to: managerEmail, subject, text })
}

export async function sendManagerCancellationRequestEmail(params: {
  managerEmail: string
  managerName?: string | null
  employeeName: string
  startDate: string
  endDate: string
}) {
  const { managerEmail, managerName, employeeName, startDate, endDate } = params
  const subject = `Cancellation requested: ${employeeName}'s vacation`
  const dashboardUrl = `${appBaseUrl}/manager`
  const text = [
    managerName ? `Hi ${managerName},` : 'Hi,',
    '',
    `${employeeName} has requested cancellation of an approved vacation.`,
    '',
    `Dates: ${startDate} → ${endDate}`,
    '',
    `You can review and approve/reject this cancellation in the Manager Dashboard:`,
    dashboardUrl,
  ].join('\n')

  await safeSendEmail({ to: managerEmail, subject, text })
}

export async function sendVacationStatusEmailToEmployee(params: {
  employeeEmail: string
  employeeName: string
  startDate: string
  endDate: string
  status: 'APPROVED' | 'REJECTED' | 'CANCELLED'
}) {
  const { employeeEmail, employeeName, startDate, endDate, status } = params
  const subject =
    status === 'APPROVED'
      ? 'Your vacation request has been approved'
      : status === 'REJECTED'
      ? 'Your vacation request has been rejected'
      : 'Your vacation cancellation has been processed'

  const text = [
    `Hi ${employeeName},`,
    '',
    `Your vacation request for ${startDate} → ${endDate} has been ${status.toLowerCase()}.`,
    '',
    `You can review your vacations here:`,
    `${appBaseUrl}/dashboard`,
  ].join('\n')

  await safeSendEmail({ to: employeeEmail, subject, text })
}

export async function sendTemporaryPasswordEmail(params: {
  email: string
  name: string
  username: string
  temporaryPassword: string
}) {
  const { email, name, username, temporaryPassword } = params
  const subject = 'Your temporary password'
  const text = [
    `Hi ${name},`,
    '',
    'An administrator has reset your password.',
    '',
    `Username: ${username}`,
    `Temporary password: ${temporaryPassword}`,
    '',
    `You can sign in here:`,
    appBaseUrl,
    '',
    'For security reasons, please sign in and change your password immediately.',
  ].join('\n')

  // IMPORTANT: we never log the password; only send via email
  await safeSendEmail({ to: email, subject, text })
}

