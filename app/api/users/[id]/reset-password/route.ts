import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'
import { apiRateLimiter, RateLimitError } from '@/lib/rate-limit'
import { AppError, NotFoundError } from '@/lib/errors'
import { logger } from '@/lib/logger'

// POST /api/users/[id]/reset-password - Generate and set a new password
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireRole(['ADMIN'])
    const { id } = await params

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimit = apiRateLimiter(`${ip}-${admin.id}`)
    if (!rateLimit.allowed) {
      throw new RateLimitError('Too many requests', rateLimit.resetAt)
    }

    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      throw new NotFoundError('User not found')
    }

    // Generate a secure random password (12 characters, alphanumeric + special chars)
    const generatePassword = () => {
      const length = 12
      const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
      const randomBytes = crypto.randomBytes(length)
      let password = ''
      for (let i = 0; i < length; i++) {
        password += charset[randomBytes[i] % charset.length]
      }
      return password
    }

    const newPassword = generatePassword()

    // Update password using Supabase Admin API
    // We need to find the Supabase auth user by email since Prisma User ID != Supabase Auth User ID
    const supabase = createAdminClient()
    
    // First, get the Supabase auth user by email
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      return NextResponse.json(
        { error: listError.message || 'Failed to list users' },
        { status: 500 }
      )
    }

    const authUser = authUsers.users.find((u) => u.email === user.email)
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'Supabase auth user not found for this email' },
        { status: 404 }
      )
    }

    // Now update the password using the Supabase auth user ID
    const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
      password: newPassword,
    })

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Failed to update password' },
        { status: 500 }
      )
    }

    logger.info('Password reset by admin', { adminId: admin.id, userId: user.id })
    
    // Never log the password - only return for UI display
    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully',
      password: newPassword, // Only returned for UI display, never logged
    })
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    logger.error('Failed to reset password', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
