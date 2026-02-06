import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH /api/countries/[id]/holidays/[holidayId] - Update holiday (toggle recurring)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; holidayId: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const { holidayId } = await params
    const { isRecurring } = await request.json()

    const holiday = await prisma.publicHoliday.update({
      where: { id: holidayId },
      data: { isRecurring: isRecurring !== undefined ? isRecurring : undefined },
    })

    return NextResponse.json({ holiday })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/countries/[id]/holidays/[holidayId] - Delete holiday (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; holidayId: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const { holidayId } = await params

    await prisma.publicHoliday.delete({
      where: { id: holidayId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
