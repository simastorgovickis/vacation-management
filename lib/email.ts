/**
 * Email sending utility
 * In production, integrate with an email service (SendGrid, AWS SES, Resend, etc.)
 * 
 * Note: Currently logs via logger in development. For production:
 * - Configure Supabase email templates in Supabase dashboard, OR
 * - Integrate with SendGrid, AWS SES, Resend, etc.
 */

import { logger } from './logger'

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  logger.info('Password reset email requested', { email })

  // TODO: Integrate with email service in production
  // Example with SendGrid:
  // const sgMail = require('@sendgrid/mail')
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  // await sgMail.send({
  //   to: email,
  //   from: process.env.FROM_EMAIL || 'noreply@yourcompany.com',
  //   subject: 'Password Reset Request',
  //   html: `Click here to reset your password: <a href="${resetUrl}">${resetUrl}</a>`
  // })
  
  // Alternative: Use Supabase's built-in email templates
  // Configure in Supabase Dashboard → Authentication → Email Templates
  
  return { success: true }
}
