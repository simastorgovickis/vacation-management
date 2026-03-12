import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { updateUserSchema } from '@/lib/validation'

const patchMeSchema = z.object({
  slackNotificationsEnabled: updateUserSchema.shape.slackNotificationsEnabled.optional(),
})

// PATCH /api/users/me - Update current user's profile settings
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth()

    const body = await request.json()
    const parsed = patchMeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    if (!('slackNotificationsEnabled' in body)) {
      return NextResponse.json({ error: 'slackNotificationsEnabled is required' }, { status: 400 })
    }
    const value = Boolean(parsed.data.slackNotificationsEnabled)
    await prisma.user.update({
      where: { id: user.id },
      data: { slackNotificationsEnabled: value },
    })

    return NextResponse.json({ success: true, slackNotificationsEnabled: value })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const e = error as { statusCode: number; message?: string }
      return NextResponse.json({ error: e.message ?? 'Unauthorized' }, { status: e.statusCode })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/users/me - Return current user profile (for profile page)
export async function GET() {
  try {
    const user = await requireAuth()
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employmentDate: true,
        slackNotificationsEnabled: true,
        countryId: true,
        Country: { select: { name: true, code: true } },
      },
    })
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    return NextResponse.json({
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      employmentDate: dbUser.employmentDate,
      slackNotificationsEnabled: dbUser.slackNotificationsEnabled,
      country: dbUser.Country ? { name: dbUser.Country.name, code: dbUser.Country.code } : null,
    })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      const e = error as { statusCode: number; message?: string }
      return NextResponse.json({ error: e.message ?? 'Unauthorized' }, { status: e.statusCode })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
