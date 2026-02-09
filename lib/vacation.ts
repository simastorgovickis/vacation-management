import { prisma } from './prisma'
import { differenceInDays, addDays, startOfMonth, endOfMonth, format } from 'date-fns'

const MONTHLY_ACCRUAL_RATE = 30 / 12 // 2.5 days per month (kept for legacy/monthly flows)
const DEFAULT_YEARLY_ALLOWANCE = 30

/**
 * Calculate vacation days between two dates (inclusive)
 */
export function calculateVacationDays(startDate: Date, endDate: Date): number {
  // Add 1 because both start and end dates are included
  return differenceInDays(endDate, startDate) + 1
}

/**
 * Get or create vacation balance for a user for a specific year
 */
export async function getOrCreateVacationBalance(userId: string, year: number) {
  let balance = await prisma.vacationBalance.findUnique({
    where: {
      userId_year: {
        userId,
        year,
      },
    },
  })

  if (!balance) {
    balance = await prisma.vacationBalance.create({
      data: {
        userId,
        year,
        accrued: 0,
        used: 0,
        adjusted: 0,
      },
    })
  }

  return balance
}

/**
 * Calculate accrued vacation days for a user up to a specific date.
 *
 * New behavior: DAILY accrual within the current year, based on DEFAULT_YEARLY_ALLOWANCE.
 * - If employment date is in the future relative to targetDate → 0.
 * - If employment starts mid‑year, we only accrue from that date.
 * - If employment started in a previous year, we accrue from Jan 1 of current year.
 */
export async function calculateAccruedDays(
  userId: string,
  targetDate: Date = new Date()
): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user || !user.employmentDate) {
    return 0
  }

  const employmentDate = new Date(user.employmentDate)
  const currentYear = targetDate.getFullYear()

  // If targetDate is before employment, nothing accrued
  if (targetDate < employmentDate) {
    return 0
  }

  // Define the accrual window within the current year
  const yearStart = new Date(currentYear, 0, 1)
  const yearEnd = new Date(currentYear, 11, 31)

  // Start accruing from the later of employment date or Jan 1 of current year
  const accrualStart =
    employmentDate > yearStart ? new Date(employmentDate) : new Date(yearStart)

  // Accrue up to targetDate (but not beyond Dec 31 of current year)
  const accrualEnd = targetDate < yearEnd ? new Date(targetDate) : new Date(yearEnd)

  // Normalize to midnight to avoid partial‑day issues
  accrualStart.setHours(0, 0, 0, 0)
  accrualEnd.setHours(0, 0, 0, 0)

  // If start is after end, no accrual in this year
  if (accrualStart > accrualEnd) {
    return 0
  }

  const daysInYear = differenceInDays(yearEnd, yearStart) + 1
  const employedDaysThisYear = differenceInDays(accrualEnd, accrualStart) + 1

  if (employedDaysThisYear <= 0) {
    return 0
  }

  const allowance = user.yearlyAllowance ?? DEFAULT_YEARLY_ALLOWANCE
  const dailyRate = allowance / daysInYear
  return employedDaysThisYear * dailyRate
}

/**
 * Get available vacation days for a user
 */
export async function getAvailableVacationDays(userId: string): Promise<number> {
  const currentYear = new Date().getFullYear()

  // Get balance for current year
  const balance = await getOrCreateVacationBalance(userId, currentYear)

  // Calculate accrued days
  const accrued = await calculateAccruedDays(userId)

  // Calculate used days from approved requests (exclude cancellation requested as they're pending cancellation)
  const approvedRequests = await prisma.vacationRequest.findMany({
    where: {
      userId,
      status: { 
        in: ['APPROVED', 'CANCELLATION_REQUESTED']
      }, // Include cancellation requested as they're still "used" until cancelled
      startDate: {
        gte: new Date(currentYear, 0, 1),
      },
      endDate: {
        lte: new Date(currentYear, 11, 31),
      },
    },
  })

  const used = approvedRequests.reduce((sum, req) => sum + req.days, 0)

  // Available = accrued + adjustments - used
  return accrued + balance.adjusted - used
}

/**
 * Process year rollover - carry over unused vacation days to the next year
 * Should be run once per year (e.g., January 1st)
 */
export async function processYearRollover(targetYear?: number) {
  const currentYear = targetYear || new Date().getFullYear()
  const previousYear = currentYear - 1

  const users = await prisma.user.findMany({
    where: {
      employmentDate: {
        not: null,
      },
    },
  })

  for (const user of users) {
    if (!user.employmentDate) continue

    // Get previous year's balance
    const previousBalance = await prisma.vacationBalance.findUnique({
      where: {
        userId_year: {
          userId: user.id,
          year: previousYear,
        },
      },
    })

    if (!previousBalance) continue

    // Calculate unused days from previous year
    // Used days are calculated from approved vacation requests
    const approvedRequests = await prisma.vacationRequest.findMany({
      where: {
        userId: user.id,
        status: { in: ['APPROVED', 'CANCELLATION_REQUESTED'] },
        startDate: {
          gte: new Date(previousYear, 0, 1),
        },
        endDate: {
          lte: new Date(previousYear, 11, 31),
        },
      },
    })

    const usedDays = approvedRequests.reduce((sum, req) => sum + req.days, 0)
    const accruedDays = await calculateAccruedDays(user.id, new Date(previousYear, 11, 31))
    const unusedDays = accruedDays + previousBalance.adjusted - usedDays

    // Only carry over positive unused days (max 5 days as per common policy, adjust as needed)
    const CARRYOVER_LIMIT = 5
    const carryoverDays = Math.max(0, Math.min(unusedDays, CARRYOVER_LIMIT))

    if (carryoverDays > 0) {
      // Create or update balance for new year with carryover
      await prisma.vacationBalance.upsert({
        where: {
          userId_year: {
            userId: user.id,
            year: currentYear,
          },
        },
        create: {
          userId: user.id,
          year: currentYear,
          accrued: 0,
          used: 0,
          adjusted: carryoverDays, // Carryover is treated as an adjustment
        },
        update: {
          adjusted: {
            increment: carryoverDays,
          },
        },
      })
    }
  }
}

/**
 * Process monthly accrual for all users (to be run via cron)
 * Also handles year rollover if it's January
 */
export async function processMonthlyAccrual() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  // If it's January, process year rollover first
  if (month === 1) {
    await processYearRollover(year)
  }

  const users = await prisma.user.findMany({
    where: {
      employmentDate: {
        not: null,
      },
    },
  })

  for (const user of users) {
    if (!user.employmentDate) continue

    const employmentDate = user.employmentDate
    const employmentYear = employmentDate.getFullYear()
    const employmentMonth = employmentDate.getMonth() + 1

    // Only accrue if employment started before or during this month
    if (
      employmentYear < year ||
      (employmentYear === year && employmentMonth <= month)
    ) {
      // Check if already accrued for this month
      const existing = await prisma.vacationAccrualLog.findUnique({
        where: {
          userId_year_month: {
            userId: user.id,
            year,
            month,
          },
        },
      })

      if (!existing) {
        await prisma.vacationAccrualLog.create({
          data: {
            userId: user.id,
            year,
            month,
            daysAccrued: MONTHLY_ACCRUAL_RATE,
          },
        })
      }
    }
  }
}
