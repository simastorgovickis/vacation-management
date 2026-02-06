import { prisma } from './prisma'

/**
 * Get public holidays for a user's country for a given year
 */
export async function getPublicHolidaysForUser(userId: string, year: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      country: {
        include: {
          publicHolidays: true,
        },
      },
    },
  })

  if (!user || !user.country) {
    return []
  }

  // Process holidays: recurring ones get adjusted to the target year
  const holidays = user.country.publicHolidays.map((holiday) => {
    const holidayDate = new Date(holiday.date)
    
    if (holiday.isRecurring) {
      // For recurring holidays, create a date for the target year
      return {
        ...holiday,
        date: new Date(year, holidayDate.getMonth(), holidayDate.getDate()),
      }
    }
    
    // For non-recurring holidays, return as-is (they should already be in the correct year)
    return holiday
  })

  // Filter to only include holidays within the target year
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31, 23, 59, 59)
  
  return holidays.filter((holiday) => {
    const holidayDate = new Date(holiday.date)
    return holidayDate >= yearStart && holidayDate <= yearEnd
  })
}
