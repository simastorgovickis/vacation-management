import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, canAccessEmployeeData } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateVacationDays } from '@/lib/vacation'
import { VacationStatus, Prisma } from '@prisma/client'
import { createVacationSchema } from '@/lib/validation'
import { apiRateLimiter, RateLimitError } from '@/lib/rate-limit'
import { AppError, AuthenticationError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/logger'

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
        user: {
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
        { error: validationResult.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    const { startDate, endDate, comment } = validationResult.data
    const start = new Date(startDate)
    const end = new Date(endDate)

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
    const days = calculateVacationDays(start, end)

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
        comment: comment || null,
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

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
