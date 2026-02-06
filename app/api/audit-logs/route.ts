import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'

// GET /api/audit-logs - Get audit logs (Admin only)
export async function GET(request: NextRequest) {
  try {
    await requireRole(['ADMIN'])
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const logs = await prisma.auditLog.findMany({
      take: limit,
      skip: offset,
      orderBy: {
        createdAt: 'desc',
      },
    })

    const total = await prisma.auditLog.count()

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
