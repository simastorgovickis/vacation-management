import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import type { AuditAction } from '@/lib/generated/prisma/client'

const AUDIT_ACTIONS: AuditAction[] = [
  'BALANCE_ADJUSTMENT',
  'USER_CREATED',
  'USER_UPDATED',
  'ROLE_CHANGED',
  'MANAGER_ASSIGNED',
  'HOLIDAYS_IMPORTED',
]

// GET /api/audit-logs - Get audit logs (Admin only). Pagination + search by action type or actor.
export async function GET(request: NextRequest) {
  try {
    await requireRole(['ADMIN'])
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10) || 10, 1), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)
    const action = searchParams.get('action') as AuditAction | null
    const actorSearch = searchParams.get('actorSearch')?.trim() || null

    const where: { action?: AuditAction; userId?: { in: string[] } } = {}
    if (action && AUDIT_ACTIONS.includes(action)) {
      where.action = action
    }
    if (actorSearch) {
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: actorSearch, mode: 'insensitive' } },
            { email: { contains: actorSearch, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      })
      const ids = users.map((u) => u.id)
      if (ids.length === 0) {
        return NextResponse.json({ logs: [], total: 0, limit, offset })
      }
      where.userId = { in: ids }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: { id: true, name: true, email: true },
          },
          targetUser: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      total,
      limit,
      offset,
    })
  } catch (error: unknown) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    logger.error('Failed to fetch audit logs', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
