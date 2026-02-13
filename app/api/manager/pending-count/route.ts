import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/manager/pending-count - Count of team requests needing approval (PENDING or CANCELLATION_REQUESTED)
export async function GET() {
  try {
    const user = await requireRole(['MANAGER', 'ADMIN'])

    const teamRelations = await prisma.managerEmployee.findMany({
      where: { managerId: user.id },
      select: { employeeId: true },
    })
    const teamMemberIds = teamRelations.map((t) => t.employeeId)
    if (teamMemberIds.length === 0) {
      return NextResponse.json({ count: 0 })
    }

    const count = await prisma.vacationRequest.count({
      where: {
        userId: { in: teamMemberIds },
        status: { in: ['PENDING', 'CANCELLATION_REQUESTED'] },
      },
    })

    return NextResponse.json({ count })
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'status' in error) {
      throw error
    }
    return NextResponse.json({ count: 0 })
  }
}
