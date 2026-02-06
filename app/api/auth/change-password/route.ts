import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { changePasswordSchema } from '@/lib/validation'
import { passwordResetRateLimiter } from '@/lib/rate-limit'
import { AppError, ValidationError, AuthenticationError, RateLimitError } from '@/lib/errors'
import { logger } from '@/lib/logger'

// POST /api/auth/change-password - Change user password
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Rate limiting for password changes
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimit = passwordResetRateLimiter(`${ip}-${user.id}`)
    if (!rateLimit.allowed) {
      throw new RateLimitError('Too many password change attempts', rateLimit.resetAt)
    }

    const body = await request.json()
    
    // Validate input
    const validationResult = changePasswordSchema.safeParse(body)
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error.errors[0]?.message || 'Invalid input')
    }

    const { currentPassword, newPassword } = validationResult.data

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (signInError) {
      throw new AuthenticationError('Current password is incorrect')
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      logger.error('Failed to update password', updateError)
      throw new AppError(updateError.message || 'Failed to update password', 500)
    }

    logger.info('Password changed successfully', { userId: user.id })
    return NextResponse.json({ success: true, message: 'Password changed successfully' })
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    logger.error('Failed to change password', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
