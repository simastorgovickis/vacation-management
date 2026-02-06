import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, canAccessEmployeeData } from '@/lib/auth'
import { getPublicHolidaysForUser } from '@/lib/holidays'
import { prisma } from '@/lib/prisma'

// GET /api/users/[id]/holidays - Get public holidays for a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    // Check access
    if (!(await canAccessEmployeeData(user, id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const currentYear = new Date().getFullYear()
    const holidays = await getPublicHolidaysForUser(id, currentYear)

    // Get user's country info
    const userWithCountry = await prisma.user.findUnique({
      where: { id },
      include: {
        country: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    })

    // Format holidays for the calendar
    const formattedHolidays = holidays.map((holiday) => {
      // Use local date to avoid timezone issues
      const holidayDate = new Date(holiday.date)
      const year = holidayDate.getFullYear()
      const month = holidayDate.getMonth()
      const day = holidayDate.getDate()
      
      // Create date string in local timezone (YYYY-MM-DD)
      const localDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      
      return {
        id: holiday.id,
        name: holiday.name,
        date: localDateString,
        country: userWithCountry?.country ? {
          name: userWithCountry.country.name,
          code: userWithCountry.country.code,
        } : null,
      }
    })

    return NextResponse.json({ holidays: formattedHolidays })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
