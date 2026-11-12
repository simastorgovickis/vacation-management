import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { setPasswordSchema } from '@/lib/validation'
import { passwordResetRateLimiter } from '@/lib/rate-limit'
import {
  clearedTemporaryPasswordMetadata,
  isTemporaryPasswordExpired,
  mustChangePassword,
} from '@/lib/password-reset'
import { logger } from '@/lib/logger'

// POST /api/auth/set-password - Replace an admin-issued temporary password with a permanent one
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    if (!mustChangePassword(user)) {
      return NextResponse.json(
        { error: 'No password change is pending. Use your profile page to change your password.' },
        { status: 400 }
      )
    }

    if (isTemporaryPasswordExpired(user)) {
      await supabase.auth.signOut()
      return NextResponse.json(
        {
          error:
            'Your temporary password has expired. Please ask your administrator to reset it again.',
        },
        { status: 401 }
      )
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimit = passwordResetRateLimiter(`${ip}-${user.id}`)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
    }

    const parsed = setPasswordSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data.newPassword,
    })
    if (updateError) {
      // e.g. "New password should be different from the old password."
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error: metaError } = await admin.auth.admin.updateUserById(user.id, {
      app_metadata: clearedTemporaryPasswordMetadata,
    })
    if (metaError) {
      logger.error('Failed to clear temporary password flag', { userId: user.id, error: metaError })
      return NextResponse.json(
        { error: 'Password saved, but something went wrong. Please try again.' },
        { status: 500 }
      )
    }

    logger.info('Temporary password replaced by user', { authUserId: user.id })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    logger.error('Failed to set password', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
