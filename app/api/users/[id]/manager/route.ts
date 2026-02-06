import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/users/[id]/manager - Get user's manager
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(['ADMIN', 'MANAGER'])
    const { id } = await params

    const relationship = await prisma.managerEmployee.findFirst({
      where: { employeeId: id },
      include: {
        User_ManagerEmployee_managerIdToUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      managerId: relationship?.managerId || null,
      manager: relationship?.User_ManagerEmployee_managerIdToUser || null,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
