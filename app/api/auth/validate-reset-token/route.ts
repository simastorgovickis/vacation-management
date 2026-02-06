import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/auth/validate-reset-token - Validate reset token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ valid: false, error: 'Token is required' }, { status: 400 })
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        User: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    })

    if (!resetToken) {
      return NextResponse.json({ valid: false, error: 'Invalid token' })
    }

    if (resetToken.used) {
      return NextResponse.json({ valid: false, error: 'Token has already been used' })
    }

    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json({ valid: false, error: 'Token has expired' })
    }

    return NextResponse.json({
      valid: true,
      userId: resetToken.userId,
      email: resetToken.User.email,
    })
  } catch (error: any) {
    return NextResponse.json(
      { valid: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
