import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'
import { Role, Prisma } from '@prisma/client'
import { createUserSchema } from '@/lib/validation'
import { apiRateLimiter, RateLimitError } from '@/lib/rate-limit'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'

// GET /api/users - List users
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(['ADMIN', 'MANAGER'])
    
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimit = apiRateLimiter(`${ip}-${user.id}`)
    if (!rateLimit.allowed) {
      throw new RateLimitError('Too many requests', rateLimit.resetAt)
    }

    const searchParams = request.nextUrl.searchParams
    const role = searchParams.get('role')

    const where: Prisma.UserWhereInput = {}

    if (user.role === 'MANAGER') {
      // Manager can only see their team
      const teamMemberIds = await prisma.managerEmployee.findMany({
        where: { managerId: user.id },
        select: { employeeId: true },
      })
      const ids = teamMemberIds.map((t) => t.employeeId)
      ids.push(user.id) // Include themselves
      where.id = { in: ids }
    }

    if (role) {
      where.role = role as Role
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        _count: {
          select: {
            managedEmployees: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ users })
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    logger.error('Failed to fetch users', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/users - Create user (Admin only)
export async function POST(request: NextRequest) {
  try {
    const admin = await requireRole(['ADMIN'])
    
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimit = apiRateLimiter(`${ip}-${admin.id}`)
    if (!rateLimit.allowed) {
      throw new RateLimitError('Too many requests', rateLimit.resetAt)
    }

    const body = await request.json()

    // Validate input
    const validationResult = createUserSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    const { email, password, name, role, employmentDate, initialBalance } = validationResult.data

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create user in Supabase Auth (using admin client)
      const supabase = createAdminClient()
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (authError) {
        throw new Error(authError.message)
      }

      // Create user in our database
      const user = await tx.user.create({
        data: {
          email,
          name,
          role: role as Role,
          employmentDate: employmentDate || new Date(),
        },
      })

      // Set initial balance if provided
      if (initialBalance !== undefined && initialBalance !== null) {
        const currentYear = new Date().getFullYear()
        await tx.vacationBalance.create({
          data: {
            userId: user.id,
            year: currentYear,
            adjusted: parseFloat(initialBalance),
            accrued: 0,
            used: 0,
          },
        })

        // Log the adjustment
        await tx.auditLog.create({
          data: {
            userId: admin.id,
            targetUserId: user.id,
            action: 'BALANCE_ADJUSTMENT',
            details: {
              reason: 'Initial balance',
              amount: parseFloat(initialBalance),
            },
          },
        })
      }

      // Log user creation
      await tx.auditLog.create({
        data: {
          userId: admin.id,
          targetUserId: user.id,
          action: 'USER_CREATED',
          details: {
            email,
            name,
            role,
          },
        },
      })

      return user
    })

    logger.info('User created', { adminId: admin.id, userId: result.id, email: result.email })
    return NextResponse.json({ user: result }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    logger.error('Failed to create user', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
