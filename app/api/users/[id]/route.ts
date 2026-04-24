import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role, Prisma } from '@/lib/generated/prisma/client'
import { updateUserSchema } from '@/lib/validation'
import { apiRateLimiter } from '@/lib/rate-limit'
import { AppError, NotFoundError, ValidationError, RateLimitError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { createAdminClient } from '@/lib/supabase/admin'

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
        { error: validationResult.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    const {
      email,
      name,
      role,
      employmentDate,
      yearlyAllowance,
      slackNotificationsEnabled,
      managerId,
      countryId,
      isActive,
    } = validationResult.data

    const updateData: Prisma.UserUpdateInput = {}
    if (email !== undefined) {
      // Keep Supabase Auth email in sync when changed
      if (email !== user.email) {
        const supabase = createAdminClient()
        const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers()
        if (listError) {
          return NextResponse.json(
            { error: listError.message || 'Failed to list authentication users' },
            { status: 500 }
          )
        }

        const authUser = authUsers.users.find((u) => u.email === user.email)
        if (authUser) {
          const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
            email,
          })
          if (updateError) {
            return NextResponse.json(
              { error: updateError.message || 'Failed to update authentication email' },
              { status: 500 }
            )
          }
        } else {
          logger.warn('Supabase auth user not found when updating email', {
            userId: user.id,
            oldEmail: user.email,
            newEmail: email,
          })
        }
      }
      updateData.email = email
    }
    if (name !== undefined) updateData.name = name
    if (role !== undefined) updateData.role = role
    if (employmentDate !== undefined) updateData.employmentDate = employmentDate
    if (yearlyAllowance !== undefined) updateData.yearlyAllowance = yearlyAllowance
    if (slackNotificationsEnabled !== undefined) {
      updateData.slackNotificationsEnabled = Boolean(slackNotificationsEnabled)
    }
    if (countryId !== undefined) {
      updateData.Country = countryId
        ? { connect: { id: countryId } }
        : { disconnect: true }
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive

      // Ban or unban in Supabase Auth so existing sessions are invalidated immediately
      const supabase = createAdminClient()
      const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers()
      if (!listError) {
        const authUser = authUsers.users.find((u) => u.email === user.email)
        if (authUser) {
          await supabase.auth.admin.updateUserById(authUser.id, {
            ban_duration: isActive ? 'none' : '876000h',
          })
        }
      }
    }

    // Use transaction for atomic updates
    const updated = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id },
        data: updateData,
      })

      // Handle manager assignment
      if (managerId !== undefined) {
        // Remove any existing manager assignment for this employee so they have exactly one manager
        await tx.managerEmployee.deleteMany({
          where: { employeeId: id },
        })
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
        }
        // else: already deleted above
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

      if (isActive !== undefined && isActive !== user.isActive) {
        await tx.auditLog.create({
          data: {
            userId: admin.id,
            targetUserId: id,
            action: isActive ? 'USER_REACTIVATED' : 'USER_DEACTIVATED',
            details: {},
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

// DELETE /api/users/[id] - Delete user (Admin only)
export async function DELETE(
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

    if (id === admin.id) {
      throw new ValidationError('You cannot delete your own account')
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    })

    if (!user) {
      throw new NotFoundError('User not found')
    }

    // Best-effort: delete Supabase Auth user (ignore errors, we still delete DB user)
    try {
      const supabase = createAdminClient()
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(user.id)
      if (deleteAuthError) {
        logger.warn('Failed to delete Supabase auth user (continuing)', {
          userId: user.id,
          error: deleteAuthError.message,
        })
      }
    } catch (supabaseError: any) {
      logger.warn('Error while deleting Supabase auth user (continuing)', {
        userId: user.id,
        error: supabaseError?.message ?? String(supabaseError),
      })
    }

    // Use a transaction so we detach audit logs and then delete the user safely
    await prisma.$transaction(async (tx) => {
      // Detach audit logs where this user was actor or target to avoid FK constraint errors
      await tx.auditLog.updateMany({
        where: { userId: user.id },
        data: { userId: null },
      })
      await tx.auditLog.updateMany({
        where: { targetUserId: user.id },
        data: { targetUserId: null },
      })

      // Now delete the user (other relations use onDelete: Cascade)
      await tx.user.delete({ where: { id: user.id } })
    })

    logger.info('User deleted', { adminId: admin.id, userId: user.id, email: user.email })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    logger.error('Failed to delete user', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
