import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { importHolidaysSchema } from '@/lib/validation'

// POST /api/countries/[id]/import-holidays - Import holidays from public APIs
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(['ADMIN'])
    const { id } = await params
    const body = await request.json()

    // Validate input
    const validationResult = importHolidaysSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      )
    }

    const { year } = validationResult.data

    // Get country info
    const country = await prisma.country.findUnique({
      where: { id },
    })

    if (!country) {
      return NextResponse.json({ error: 'Country not found' }, { status: 404 })
    }

    const targetYear = year || new Date().getFullYear()
    const startDate = `${targetYear}-01-01`
    const endDate = `${targetYear}-12-31`

    // Try holiday APIs for the requested year only (no importing a different year)
    let apiHolidays: any[] = []

    // 1) Nager.Date – 100+ countries (does NOT include India IN)
    try {
      const nagerUrl = `https://date.nager.at/api/v3/PublicHolidays/${targetYear}/${country.code}`
      const response = await fetch(nagerUrl, {
        headers: { 'Accept': 'application/json' },
      })
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data) && data.length > 0) {
          apiHolidays = data.map((h: any) => ({
            name: h.localName || h.name,
            date: h.date,
            startDate: h.date,
          }))
        }
      }
    } catch (_) {}

    // 2) OpenHolidays API (mainly European + some others; does NOT include India)
    if (apiHolidays.length === 0) {
      try {
        const openHolidaysUrl = `https://openholidaysapi.org/PublicHolidays?countryIsoCode=${country.code}&validFrom=${startDate}&validTo=${endDate}`
        const response = await fetch(openHolidaysUrl, {
          headers: { 'Accept': 'application/json' },
        })
        if (response.ok) {
          const data = await response.json()
          const list = Array.isArray(data) ? data : data?.holidays
          if (Array.isArray(list) && list.length > 0) {
            apiHolidays = list.map((h: any) => {
              const name = typeof h.name === 'string' ? h.name : (h.name?.[0]?.text ?? h.name?.en ?? 'Unknown Holiday')
              const dateStr = h.startDate || h.date || h.dateISO || h.dateString
              return { name, date: dateStr, startDate: dateStr }
            })
          }
        }
      } catch (_) {}
    }

    // 3) Calendarific (optional) – supports India and 230+ countries; requires free API key
    if (apiHolidays.length === 0 && process.env.CALENDARIFIC_API_KEY) {
      try {
        // Limit to national/public holidays only to avoid importing dozens of local observances.
        // If a regionCode is configured on the Country (e.g. IN-MH), use it as Calendarific `location`
        // to fetch holidays for that specific state/region.
        const baseUrl = new URL('https://calendarific.com/api/v2/holidays')
        baseUrl.searchParams.set('api_key', process.env.CALENDARIFIC_API_KEY)
        baseUrl.searchParams.set('country', country.code)
        baseUrl.searchParams.set('year', String(targetYear))
        baseUrl.searchParams.set('type', 'national')
        if (country.regionCode) {
          baseUrl.searchParams.set('location', country.regionCode.toLowerCase())
        }

        const calUrl = baseUrl.toString()
        const response = await fetch(calUrl, { headers: { 'Accept': 'application/json' } })
        if (response.ok) {
          const data = await response.json()
          const list = data?.response?.holidays
          if (Array.isArray(list) && list.length > 0) {
            apiHolidays = list.map((h: any) => {
              const dateStr = h.date?.iso || (h.date?.datetime ? `${h.date.datetime.year}-${String(h.date.datetime.month).padStart(2, '0')}-${String(h.date.datetime.day).padStart(2, '0')}` : '')
              return { name: h.name || 'Unknown Holiday', date: dateStr, startDate: dateStr }
            })
          }
        }
      } catch (_) {}
    }

    if (apiHolidays.length === 0) {
      const isIndia = country.code.toUpperCase() === 'IN'
      const suggestion = isIndia
        ? `India (IN) is not supported by the free APIs (Nager.Date, OpenHolidays). To import India holidays:\n1. Get a free API key at https://calendarific.com and add CALENDARIFIC_API_KEY to your environment, then try again.\n2. Or add holidays manually using the form below.`
        : `Please verify:\n1. The country code "${country.code}" is correct (ISO 3166-1 alpha-2)\n2. The country is supported by the holiday APIs (Nager.Date does not support all countries)\n3. You can add CALENDARIFIC_API_KEY (free at calendarific.com) for more countries including India\n4. Or add holidays manually using the form below`
      return NextResponse.json(
        {
          error: `No holidays found for ${country.name} (${country.code}) in ${targetYear}.`,
          suggestion,
        },
        { status: 404 }
      )
    }

    // Import holidays (skip duplicates)
    // All imported holidays are set as non-recurring since they're imported for a specific year
    // To get holidays for future years, import again for that year
    const imported: string[] = []
    const skipped: string[] = []

    for (const holiday of apiHolidays) {
      // Handle different API response formats
      const holidayName = 
        holiday.name?.[0]?.text || // OpenHolidays format
        holiday.name?.en || // Alternative format
        holiday.name || // Simple string
        holiday.title ||
        holiday.localName ||
        'Unknown Holiday'
      
      const holidayDate = new Date(
        holiday.startDate || 
        holiday.date || 
        holiday.dateISO ||
        holiday.dateString
      )

      if (isNaN(holidayDate.getTime())) {
        // Skip invalid dates silently
        continue
      }

      // Normalize date to start of day
      const normalizedDate = new Date(holidayDate.getFullYear(), holidayDate.getMonth(), holidayDate.getDate())

      // Check if holiday already exists (by name and date)
      const existing = await prisma.publicHoliday.findFirst({
        where: {
          countryId: id,
          name: holidayName,
          date: normalizedDate,
        },
      })

      if (existing) {
        skipped.push(holidayName)
        continue
      }

      try {
        // Create new holiday - all imported holidays are non-recurring
        // This ensures they show up for the specific year they were imported for
        await prisma.publicHoliday.create({
          data: {
            countryId: id,
            name: holidayName,
            date: normalizedDate,
            isRecurring: false, // All imported holidays are non-recurring
          },
        })

        imported.push(holidayName)
      } catch (error: any) {
        // Skip if there's a unique constraint violation (duplicate)
        if (error.code === 'P2002') {
          skipped.push(holidayName)
        } else {
          // Log error but continue with other holidays
          // In production, you might want to log to error tracking service
        }
      }
    }

    return NextResponse.json({
      success: true,
      imported: imported.length,
      skipped: skipped.length,
      importedNames: imported,
      skippedNames: skipped,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
