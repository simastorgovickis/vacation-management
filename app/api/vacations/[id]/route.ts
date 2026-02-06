import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role, VacationStatus, Prisma } from '@prisma/client'
import { updateVacationSchema } from '@/lib/validation'
import { apiRateLimiter } from '@/lib/rate-limit'
import { AppError, NotFoundError, AuthorizationError, ValidationError, RateLimitError } from '@/lib/errors'
import { logger } from '@/lib/logger'

// GET /api/vacations/[id] - Get single vacation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimit = apiRateLimiter(`${ip}-${user.id}`)
    if (!rateLimit.allowed) {
      throw new RateLimitError('Too many requests', rateLimit.resetAt)
    }
    const vacation = await prisma.vacationRequest.findUnique({
      where: { id },
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

    if (!vacation) {
      throw new NotFoundError('Vacation request not found')
    }

    // Check access
    if (user.role !== 'ADMIN' && vacation.userId !== user.id) {
      // Check if manager can access
      if (user.role === 'MANAGER') {
        const relationship = await prisma.managerEmployee.findUnique({
          where: {
            managerId_employeeId: {
              managerId: user.id,
              employeeId: vacation.userId,
            },
          },
        })
        if (!relationship) {
          throw new AuthorizationError()
        }
      } else {
        throw new AuthorizationError()
      }
    }

    return NextResponse.json({ vacation })
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    logger.error('Failed to fetch vacation', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/vacations/[id] - Update vacation (approve/reject/cancel)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimit = apiRateLimiter(`${ip}-${user.id}`)
    if (!rateLimit.allowed) {
      throw new RateLimitError('Too many requests', rateLimit.resetAt)
    }

    const body = await request.json()

    // Validate input
    const validationResult = updateVacationSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    const { status, rejectionReason } = validationResult.data

    const vacation = await prisma.vacationRequest.findUnique({
      where: { id },
    })

    if (!vacation) {
      throw new NotFoundError('Vacation request not found')
    }

    // Only managers and admins can approve/reject
    if (status === 'APPROVED' || status === 'REJECTED') {
      if (user.role === 'EMPLOYEE' && vacation.userId !== user.id) {
        throw new AuthorizationError()
      }

      if (user.role === 'MANAGER') {
        const relationship = await prisma.managerEmployee.findUnique({
          where: {
            managerId_employeeId: {
              managerId: user.id,
              employeeId: vacation.userId,
            },
          },
        })
        if (!relationship && vacation.userId !== user.id) {
          throw new AuthorizationError()
        }
      }

      if (status === 'REJECTED' && !rejectionReason) {
        throw new ValidationError('Rejection reason is required')
      }

      // Validate balance before approval
      if (status === 'APPROVED') {
        const { getAvailableVacationDays } = await import('@/lib/vacation')
        const availableDays = await getAvailableVacationDays(vacation.userId)
        if (availableDays < vacation.days) {
          throw new ValidationError(
            `Insufficient vacation days. Available: ${availableDays.toFixed(1)}, Required: ${vacation.days}`
          )
        }
      }
    }

    // Employees can request cancellation of their own approved vacations
    if (status === 'CANCELLATION_REQUESTED') {
      if (vacation.userId !== user.id) {
        throw new AuthorizationError()
      }
      if (vacation.status !== 'APPROVED') {
        throw new ValidationError('Only approved vacations can be requested for cancellation')
      }
    }

    // Managers can approve or reject cancellation requests
    if (status === 'CANCELLED' && vacation.status === 'CANCELLATION_REQUESTED') {
      // Manager approval of cancellation request
      if (user.role === 'EMPLOYEE' && vacation.userId !== user.id) {
        throw new AuthorizationError()
      }

      if (user.role === 'MANAGER') {
        const relationship = await prisma.managerEmployee.findUnique({
          where: {
            managerId_employeeId: {
              managerId: user.id,
              employeeId: vacation.userId,
            },
          },
        })
        if (!relationship && vacation.userId !== user.id) {
          throw new AuthorizationError()
        }
      }
    }

    // Managers can reject cancellation requests (revert to APPROVED)
    if (status === 'APPROVED' && vacation.status === 'CANCELLATION_REQUESTED') {
      if (user.role === 'EMPLOYEE' && vacation.userId !== user.id) {
        throw new AuthorizationError()
      }

      if (user.role === 'MANAGER') {
        const relationship = await prisma.managerEmployee.findUnique({
          where: {
            managerId_employeeId: {
              managerId: user.id,
              employeeId: vacation.userId,
            },
          },
        })
        if (!relationship && vacation.userId !== user.id) {
          throw new AuthorizationError()
        }
      }
    }

    // Employees can still cancel their own pending requests directly
    if (status === 'CANCELLED' && vacation.status === 'PENDING') {
      if (vacation.userId !== user.id) {
        throw new AuthorizationError()
      }
    }

    const updateData: Prisma.VacationRequestUpdateInput = {
      status: status as VacationStatus,
      rejectionReason: status === 'REJECTED' ? rejectionReason : null,
    }

    // Set approvedById and approvedAt for approval/rejection actions
    if (status === 'APPROVED' || status === 'REJECTED') {
      updateData.approvedById = user.id
      updateData.approvedAt = new Date()
    }

    // When cancelling a cancellation request (approving cancellation), also set approvedById
    if (status === 'CANCELLED' && vacation.status === 'CANCELLATION_REQUESTED') {
      updateData.approvedById = user.id
      updateData.approvedAt = new Date()
    }

    // When rejecting cancellation request (reverting to APPROVED), clear rejection reason
    if (status === 'APPROVED' && vacation.status === 'CANCELLATION_REQUESTED') {
      updateData.rejectionReason = null
    }

    const updated = await prisma.vacationRequest.update({
      where: { id },
      data: updateData,
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

    logger.info('Vacation request updated', { 
      userId: user.id, 
      vacationId: id, 
      oldStatus: vacation.status, 
      newStatus: status 
    })
    return NextResponse.json({ vacation: updated })
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    logger.error('Failed to update vacation request', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
