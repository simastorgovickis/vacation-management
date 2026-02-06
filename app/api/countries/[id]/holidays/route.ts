import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createHolidaySchema } from '@/lib/validation'

// GET /api/countries/[id]/holidays - Get holidays for a country
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const holidays = await prisma.publicHoliday.findMany({
      where: { countryId: id },
      orderBy: {
        date: 'asc',
      },
    })

    return NextResponse.json({ holidays })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/countries/[id]/holidays - Add holiday to country (Admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const { id } = await params
    const { name, date, isRecurring } = await request.json()

    if (!name || !date) {
      return NextResponse.json(
        { error: 'Name and date are required' },
        { status: 400 }
      )
    }

    const holiday = await prisma.publicHoliday.create({
      data: {
        countryId: id,
        name,
        date: new Date(date),
        isRecurring: isRecurring !== false, // Default to true
      },
    })

    return NextResponse.json({ holiday }, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This holiday already exists for this country' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
