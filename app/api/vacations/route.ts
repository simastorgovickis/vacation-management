import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, canAccessEmployeeData } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateRequestedDaysFromPortion, calculateVacationDaysForUser } from '@/lib/vacation'
import { VacationStatus, Prisma } from '@/lib/generated/prisma/client'
import { createVacationSchema } from '@/lib/validation'
import { apiRateLimiter } from '@/lib/rate-limit'
import { AppError, AuthenticationError, ValidationError, RateLimitError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import {
  sendManagerNewVacationRequestEmail,
} from '@/lib/email'
import { postToSlackChannel } from '@/lib/slack'

function getBaseUrl() {
  const raw = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return raw.replace(/\/+$/, '')
}

function formatDayPortionLabel(dayPortion: 'FULL' | 'FIRST_HALF' | 'SECOND_HALF' | null | undefined) {
  if (dayPortion === 'FIRST_HALF') return 'First half'
  if (dayPortion === 'SECOND_HALF') return 'Second half'
  return null
}

// GET /api/vacations - List vacations
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimit = apiRateLimiter(`${ip}-${user.id}`)
    if (!rateLimit.allowed) {
      throw new RateLimitError('Too many requests', rateLimit.resetAt)
    }

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    const where: Prisma.VacationRequestWhereInput = {}

    if (user.role === 'ADMIN') {
      // Admin can see all
      if (userId) {
        where.userId = userId
      }
    } else if (user.role === 'MANAGER') {
      // Manager can see their team's vacations
      const teamMemberIds = await prisma.managerEmployee.findMany({
        where: { managerId: user.id },
        select: { employeeId: true },
      })
      const ids = teamMemberIds.map((t) => t.employeeId)
      ids.push(user.id) // Include their own
      where.userId = { in: ids }
      if (userId && !ids.includes(userId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (userId) {
        where.userId = userId
      }
    } else {
      // Employee can only see their own
      where.userId = user.id
    }

    const vacations = await prisma.vacationRequest.findMany({
      where,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ vacations })
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logger.error('Failed to fetch vacations', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/vacations - Create vacation request
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimit = apiRateLimiter(`${ip}-${user.id}`)
    if (!rateLimit.allowed) {
      throw new RateLimitError('Too many requests', rateLimit.resetAt)
    }

    const body = await request.json()

    // Validate input
    const validationResult = createVacationSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    const { startDate, endDate, comment, dayPortion } = validationResult.data
    const start = new Date(startDate)
    const end = new Date(endDate)
    const isSingleDay =
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate()
    const normalizedDayPortion = dayPortion ?? 'FULL'
    if (!isSingleDay && normalizedDayPortion !== 'FULL') {
      return NextResponse.json(
        { error: 'Half-day is available only for single-day requests' },
        { status: 400 }
      )
    }


    // Normalize dates to start of day for comparison
    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)

    // Check for overlapping approved or pending vacations
    const overlappingVacations = await prisma.vacationRequest.findFirst({
      where: {
        userId: user.id,
        status: { in: ['PENDING', 'APPROVED', 'CANCELLATION_REQUESTED'] },
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start },
          },
        ],
      },
    })

    if (overlappingVacations) {
      return NextResponse.json(
        { 
          error: `You already have a ${overlappingVacations.status.toLowerCase()} vacation request overlapping these dates` 
        },
        { status: 400 }
      )
    }

    // Check if user has enough vacation days
    const { getAvailableVacationDays } = await import('@/lib/vacation')
    const availableDays = await getAvailableVacationDays(user.id)
    const baseDays = await calculateVacationDaysForUser(user.id, start, end)
    const days = calculateRequestedDaysFromPortion(baseDays, start, end, normalizedDayPortion)

    if (availableDays < days) {
      return NextResponse.json(
        { 
          error: `Insufficient vacation days. Available: ${availableDays.toFixed(1)}, Required: ${days}` 
        },
        { status: 400 }
      )
    }

    const vacation = await prisma.vacationRequest.create({
      data: {
        userId: user.id,
        startDate: start,
        endDate: end,
        days,
        dayPortion: normalizedDayPortion,
        comment: comment || null,
        status: 'PENDING',
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Notify manager(s) about new vacation request (fire-and-forget)
    try {
      const managerRelations = await prisma.managerEmployee.findMany({
        where: { employeeId: user.id },
        include: {
          User_ManagerEmployee_managerIdToUser: {
            select: { id: true, name: true, email: true, slackNotificationsEnabled: true },
          },
        },
      })

      await Promise.all(
        managerRelations
          .map((rel) => rel.User_ManagerEmployee_managerIdToUser)
          .filter((m) => m && m.email)
          .map(async (manager) => {
            await sendManagerNewVacationRequestEmail({
              managerEmail: manager.email,
              managerName: manager.name,
              employeeName: vacation.User.name,
              startDate: startDate,
              endDate: endDate,
              comment,
            })

            if (manager.slackNotificationsEnabled) {
              const baseUrl = getBaseUrl()
              const dayPortionLabel = formatDayPortionLabel(vacation.dayPortion)
              const lines = [
                `New vacation request from *${vacation.User.name}*`,
                `Dates: ${startDate} → ${endDate}`,
                dayPortionLabel ? `Day portion: ${dayPortionLabel}` : null,
                comment ? `Comment: ${comment}` : null,
                `Review: ${baseUrl}/manager`,
              ].filter(Boolean)
              await postToSlackChannel(lines.join('\n'))
            }
          })
      )
    } catch (notifyError) {
      logger.error('Failed to send manager notification for new vacation request', {
        error: notifyError,
        userId: user.id,
        vacationId: vacation.id,
      })
    }

    logger.info('Vacation request created', { userId: user.id, vacationId: vacation.id, days: vacation.days })
    return NextResponse.json({ vacation }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    logger.error('Failed to create vacation request', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
