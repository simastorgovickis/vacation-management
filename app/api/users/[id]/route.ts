import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role, Prisma } from '@prisma/client'
import { updateUserSchema } from '@/lib/validation'
import { apiRateLimiter } from '@/lib/rate-limit'
import { AppError, NotFoundError, ValidationError, RateLimitError } from '@/lib/errors'
import { logger } from '@/lib/logger'

// PATCH /api/users/[id] - Update user
export async function PATCH(
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

    const body = await request.json()

    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      throw new NotFoundError('User not found')
    }

    // Validate input (allow partial updates)
    const validationResult = updateUserSchema.partial().safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    const { name, role, employmentDate, managerId, countryId } = validationResult.data

    const updateData: Prisma.UserUpdateInput = {}
    if (name !== undefined) updateData.name = name
    if (role !== undefined) updateData.role = role
    if (employmentDate !== undefined) updateData.employmentDate = employmentDate
    if (countryId !== undefined) updateData.countryId = countryId || null

    // Use transaction for atomic updates
    const updated = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data: updateData,
      })

      // Handle manager assignment
      if (managerId !== undefined) {
        if (managerId) {
          // Prevent self-assignment
          if (managerId === id) {
            throw new ValidationError('User cannot be assigned as their own manager')
          }

          // Prevent circular manager assignments (A manages B, B manages A)
          const wouldCreateCircular = await tx.managerEmployee.findUnique({
            where: {
              managerId_employeeId: {
                managerId: id,
                employeeId: managerId,
              },
            },
          })

          if (wouldCreateCircular) {
            throw new ValidationError('Circular manager assignment detected. Cannot assign this manager.')
          }

          // Ensure manager exists and has MANAGER or ADMIN role
          const manager = await tx.user.findUnique({
            where: { id: managerId },
          })

          if (!manager) {
            throw new NotFoundError('Manager not found')
          }

          if (manager.role !== 'MANAGER' && manager.role !== 'ADMIN') {
            throw new ValidationError('Manager must have MANAGER or ADMIN role')
          }

          // Assign manager
          await tx.managerEmployee.upsert({
            where: {
              managerId_employeeId: {
                managerId,
                employeeId: id,
              },
            },
            create: {
              managerId,
              employeeId: id,
            },
            update: {},
          })

          await tx.auditLog.create({
            data: {
              userId: admin.id,
              targetUserId: id,
              action: 'MANAGER_ASSIGNED',
              details: {
                managerId,
              },
            },
          })
        } else {
          // Remove manager assignment
          await tx.managerEmployee.deleteMany({
            where: {
              employeeId: id,
            },
          })
        }
      }

      if (role && role !== user.role) {
        await tx.auditLog.create({
          data: {
            userId: admin.id,
            targetUserId: id,
            action: 'ROLE_CHANGED',
            details: {
              oldRole: user.role,
              newRole: role,
            },
          },
        })
      }

      return updatedUser
    })

    logger.info('User updated', { adminId: admin.id, userId: id, updates: Object.keys(updateData) })
    return NextResponse.json({ user: updated })
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    logger.error('Failed to update user', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
