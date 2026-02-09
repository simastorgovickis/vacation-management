import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole, canAccessEmployeeData } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAvailableVacationDays } from '@/lib/vacation'
import { adjustBalanceSchema } from '@/lib/validation'
import { apiRateLimiter } from '@/lib/rate-limit'
import { AppError, AuthorizationError, RateLimitError } from '@/lib/errors'
import { logger } from '@/lib/logger'

// GET /api/balances/[userId] - Get vacation balance
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await requireAuth()
    const { userId } = await params

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimit = apiRateLimiter(`${ip}-${user.id}`)
    if (!rateLimit.allowed) {
      throw new RateLimitError('Too many requests', rateLimit.resetAt)
    }

    // Check access
    if (!(await canAccessEmployeeData(user, userId))) {
      throw new AuthorizationError()
    }

    const available = await getAvailableVacationDays(userId)

    const currentYear = new Date().getFullYear()
    const balance = await prisma.vacationBalance.findUnique({
      where: {
        userId_year: {
          userId,
          year: currentYear,
        },
      },
    })

    const approvedRequests = await prisma.vacationRequest.findMany({
      where: {
        userId,
        status: { in: ['APPROVED', 'CANCELLATION_REQUESTED'] }, // Include cancellation requested as they're still "used" until cancelled
        startDate: {
          gte: new Date(currentYear, 0, 1),
        },
        endDate: {
          lte: new Date(currentYear, 11, 31),
        },
      },
    })

    const used = approvedRequests.reduce((sum, req) => sum + req.days, 0)

    return NextResponse.json({
      available,
      used,
      adjusted: balance?.adjusted || 0,
    })
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    logger.error('Failed to fetch balance', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/balances/[userId] - Adjust balance (Admin & Manager)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const actor = await requireRole(['ADMIN', 'MANAGER'])
    const { userId } = await params
    
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimit = apiRateLimiter(`${ip}-${actor.id}`)
    if (!rateLimit.allowed) {
      throw new RateLimitError('Too many requests', rateLimit.resetAt)
    }

    const body = await request.json()

    // Managers can only adjust balances for employees they can access
    if (actor.role === 'MANAGER') {
      const canAccess = await canAccessEmployeeData(actor, userId)
      if (!canAccess) {
        throw new AuthorizationError()
      }
    }

    // Validate input
    const validationResult = adjustBalanceSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    const { amount: adjustmentAmount, reason } = validationResult.data

    // Use transaction for atomic balance update and audit log
    const currentYear = new Date().getFullYear()
    const result = await prisma.$transaction(async (tx) => {
      const balance = await tx.vacationBalance.upsert({
        where: {
          userId_year: {
            userId,
            year: currentYear,
          },
        },
        create: {
          userId,
          year: currentYear,
          adjusted: adjustmentAmount,
          accrued: 0,
          used: 0,
        },
        update: {
          adjusted: {
            increment: adjustmentAmount,
          },
        },
      })

      // Log the adjustment
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          targetUserId: userId,
          action: 'BALANCE_ADJUSTMENT',
          details: {
            reason: reason.trim(),
            amount: adjustmentAmount,
            newBalance: balance.adjusted,
          },
        },
      })

      return balance
    })

    logger.info('Balance adjusted', { 
      actorId: actor.id, 
      userId, 
      amount: adjustmentAmount,
      reason: reason.trim()
    })
    return NextResponse.json({ balance: result })
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    logger.error('Failed to adjust balance', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
