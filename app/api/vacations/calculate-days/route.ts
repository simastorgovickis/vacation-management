import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { calculateRequestedDaysFromPortion, calculateVacationDaysBreakdownForUser } from '@/lib/vacation'
import { z } from 'zod'

const schema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayPortion: z.enum(['FULL', 'FIRST_HALF', 'SECOND_HALF']).optional().nullable(),
})

// POST /api/vacations/calculate-days - Calculate used vacation days excluding weekends/holidays for current user
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const start = new Date(parsed.data.startDate + 'T00:00:00')
    const end = new Date(parsed.data.endDate + 'T00:00:00')
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return NextResponse.json({ days: 0 })
    }

    const breakdown = await calculateVacationDaysBreakdownForUser(user.id, start, end)
    const usedDays = calculateRequestedDaysFromPortion(
      breakdown.usedDays,
      start,
      end,
      parsed.data.dayPortion ?? 'FULL'
    )
    return NextResponse.json({ ...breakdown, usedDays })
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

