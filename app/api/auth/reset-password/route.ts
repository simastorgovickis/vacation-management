import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'
import { resetPasswordSchema } from '@/lib/validation'

// POST /api/auth/reset-password - Reset password using token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = resetPasswordSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    const { token, newPassword } = validationResult.data

    // Validate token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        User: true,
      },
    })

    if (!resetToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    if (resetToken.used) {
      return NextResponse.json({ error: 'Token has already been used' }, { status: 400 })
    }

    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json({ error: 'Token has expired' }, { status: 400 })
    }

    // Update password using Supabase Admin API
    const supabase = createAdminClient()
    const { error: updateError } = await supabase.auth.admin.updateUserById(resetToken.userId, {
      password: newPassword,
    })

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Failed to update password' },
        { status: 500 }
      )
    }

    // Mark token as used
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    })

    return NextResponse.json({ success: true, message: 'Password reset successfully' })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
