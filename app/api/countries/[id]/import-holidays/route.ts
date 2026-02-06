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
        { error: validationResult.error.errors[0]?.message || 'Invalid input' },
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

    // Try multiple holiday APIs as fallback
    let apiHolidays: any[] = []
    let lastError: string | null = null

    // Try date.nager.at API first (more reliable, supports 100+ countries)
    try {
      const nagerUrl = `https://date.nager.at/api/v3/PublicHolidays/${targetYear}/${country.code}`
      const response = await fetch(nagerUrl, {
        headers: {
          'Accept': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data) && data.length > 0) {
          apiHolidays = data.map((h: any) => ({
            name: h.localName || h.name, // Use local name if available
            date: h.date,
            startDate: h.date,
          }))
        }
      } else {
        lastError = `Nager API returned ${response.status}: ${response.statusText}`
      }
    } catch (error: any) {
      lastError = `Nager API error: ${error.message}`
    }

    // Fallback: Try OpenHolidays API
    if (apiHolidays.length === 0) {
      try {
        const openHolidaysUrl = `https://openholidaysapi.org/PublicHolidays?countryIsoCode=${country.code}&validFrom=${startDate}&validTo=${endDate}`
        const response = await fetch(openHolidaysUrl, {
          headers: {
            'Accept': 'application/json',
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data)) {
            apiHolidays = data
          } else if (data.holidays && Array.isArray(data.holidays)) {
            apiHolidays = data.holidays
          }
        } else {
          lastError = lastError 
            ? `${lastError}; OpenHolidays API returned ${response.status}`
            : `OpenHolidays API returned ${response.status}: ${response.statusText}`
        }
      } catch (error: any) {
        lastError = lastError 
          ? `${lastError}; OpenHolidays API error: ${error.message}`
          : `OpenHolidays API error: ${error.message}`
      }
    }

    if (apiHolidays.length === 0) {
      return NextResponse.json(
        { 
          error: `No holidays found for ${country.name} (${country.code}) in ${targetYear}.`,
          suggestion: `Please verify:\n1. The country code "${country.code}" is correct (ISO 3166-1 alpha-2)\n2. The country is supported by the holiday APIs\n3. You can manually add holidays using the form below`
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
