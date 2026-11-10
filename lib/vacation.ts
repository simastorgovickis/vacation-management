import { prisma } from './prisma'
import {
  differenceInDays,
  addDays,
  startOfMonth,
  endOfMonth,
  format,
  isWeekend,
} from 'date-fns'

const MONTHLY_ACCRUAL_RATE = 30 / 12 // 2.5 days per month (kept for legacy/monthly flows)
const DEFAULT_YEARLY_ALLOWANCE = 30
// Max unused days carried over into the next year at rollover (hard-coded policy, not an admin setting)
export const CARRYOVER_LIMIT = 30
export type VacationDayPortion = 'FULL' | 'FIRST_HALF' | 'SECOND_HALF'

/**
 * Calculate vacation days between two dates (inclusive)
 */
export function calculateVacationDays(startDate: Date, endDate: Date): number {
  // Add 1 because both start and end dates are included
  return differenceInDays(endDate, startDate) + 1
}

function toLocalYYYYMMDD(d: Date) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Calculate vacation days to be used between two dates (inclusive),
 * excluding weekends and the user's assigned public holidays (based on their country).
 *
 * If the user has no country assigned, this falls back to counting weekdays only.
 */
export async function calculateVacationDaysForUser(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const breakdown = await calculateVacationDaysBreakdownForUser(userId, startDate, endDate)
  return breakdown.usedDays
}

export async function calculateVacationDaysBreakdownForUser(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalCalendarDays: number
  usedDays: number
  excludedWeekendDays: number
  excludedHolidayDays: number
}> {
  const start = new Date(startDate)
  const end = new Date(endDate)
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)

  if (end < start) {
    return { totalCalendarDays: 0, usedDays: 0, excludedWeekendDays: 0, excludedHolidayDays: 0 }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { countryId: true },
  })

  const holidaySet = new Set<string>()
  if (user?.countryId) {
    const holidays = await prisma.publicHoliday.findMany({
      where: {
        countryId: user.countryId,
        date: { gte: start, lte: end },
      },
      select: { date: true },
    })
    for (const h of holidays) {
      holidaySet.add(toLocalYYYYMMDD(new Date(h.date)))
    }
  }

  let usedDays = 0
  let excludedWeekendDays = 0
  let excludedHolidayDays = 0
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    if (isWeekend(d)) {
      excludedWeekendDays += 1
      continue
    }
    const key = toLocalYYYYMMDD(d)
    if (holidaySet.has(key)) {
      excludedHolidayDays += 1
      continue
    }
    usedDays += 1
  }

  const totalCalendarDays = differenceInDays(end, start) + 1
  return { totalCalendarDays, usedDays, excludedWeekendDays, excludedHolidayDays }
}

export function calculateRequestedDaysFromPortion(
  baseUsedDays: number,
  startDate: Date,
  endDate: Date,
  dayPortion?: VacationDayPortion | null
): number {
  const normalizedPortion = dayPortion ?? 'FULL'
  const isSingleDay =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate()

  if (!isSingleDay) return baseUsedDays
  if (normalizedPortion === 'FULL') return baseUsedDays
  if (baseUsedDays <= 0) return 0
  return 0.5
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

function yearStartDate(year: number) {
  return new Date(year, 0, 1)
}

function yearEndDate(year: number) {
  return new Date(year, 11, 31)
}

/**
 * Chargeable days of a stored request that fall within `year`.
 * Requests fully inside the year use their stored `days`; requests spanning
 * New Year are re-split by calendar year (weekends/holidays excluded).
 */
async function chargeableDaysInYear(
  userId: string,
  req: { startDate: Date; endDate: Date; days: number },
  year: number
): Promise<number> {
  const s = new Date(req.startDate)
  const e = new Date(req.endDate)
  if (s.getFullYear() === year && e.getFullYear() === year) return req.days
  const clipStart = s > yearStartDate(year) ? s : yearStartDate(year)
  const clipEnd = e < yearEndDate(year) ? e : yearEndDate(year)
  if (clipStart > clipEnd) return 0
  const breakdown = await calculateVacationDaysBreakdownForUser(userId, clipStart, clipEnd)
  return breakdown.usedDays
}

/**
 * Days used in `year` by approved requests (and ones pending cancellation, which
 * still count until cancelled). Requests overlapping the year boundary are
 * charged only for the days that fall inside `year`.
 */
export async function getUsedDaysInYear(userId: string, year: number): Promise<number> {
  const requests = await prisma.vacationRequest.findMany({
    where: {
      userId,
      status: { in: ['APPROVED', 'CANCELLATION_REQUESTED'] },
      startDate: { lte: new Date(year, 11, 31, 23, 59, 59) },
      endDate: { gte: yearStartDate(year) },
    },
  })
  let used = 0
  for (const req of requests) {
    used += await chargeableDaysInYear(userId, req, year)
  }
  return used
}

/**
 * Carry-over expected into `year` from `year - 1`, for years whose rollover
 * hasn't run yet (i.e. future years). For the current or past years the
 * carry-over is already stored in the balance's `adjusted` field, so this is 0.
 *
 * `extraUsedPrevYear` lets callers account for days of a not-yet-approved request
 * that fall in the previous year (they reduce what would be carried over).
 */
async function getProjectedCarryover(
  userId: string,
  year: number,
  extraUsedPrevYear = 0
): Promise<number> {
  if (year <= new Date().getFullYear()) return 0
  const prevYear = year - 1
  const prevBalance = await getYearBalance(userId, prevYear, yearEndDate(prevYear))
  return Math.max(0, Math.min(prevBalance - extraUsedPrevYear, CARRYOVER_LIMIT))
}

/**
 * Balance available within `year` as of `asOf` (must fall in `year`):
 * accrued so far that year + adjustments (incl. stored carry-over)
 * + projected carry-over (future years only) − days used in that year.
 */
async function getYearBalance(
  userId: string,
  year: number,
  asOf: Date,
  extraUsedPrevYear = 0
): Promise<number> {
  const balance = await prisma.vacationBalance.findUnique({
    where: { userId_year: { userId, year } },
  })
  const accrued = await calculateAccruedDays(userId, asOf)
  const used = await getUsedDaysInYear(userId, year)
  const carryover = await getProjectedCarryover(userId, year, extraUsedPrevYear)
  return accrued + (balance?.adjusted ?? 0) + carryover - used
}

/**
 * Get available vacation days for a user within `targetDate`'s year, as of `targetDate`.
 *
 * By default this reports the balance as of today. For checking a specific
 * request (which may span New Year), use `checkRequestBalance` instead.
 */
export async function getAvailableVacationDays(
  userId: string,
  targetDate: Date = new Date()
): Promise<number> {
  return getYearBalance(userId, targetDate.getFullYear(), targetDate)
}

export type YearBalanceCheck = {
  year: number
  /** Last day of the request within this year — the date the balance is projected to */
  asOf: Date
  requested: number
  available: number
}

/**
 * Check whether a user can afford a request, year by year.
 *
 * Each calendar year's portion of the request is checked against that year's
 * balance, projected to the last day of the request within the year — so a
 * Dec 21 → Jan 3 trip draws its December days from this year's balance and
 * its January days from next year's (incl. projected carry-over). Years where
 * the request uses no days (e.g. only weekends/holidays) are omitted.
 */
export async function checkRequestBalance(
  userId: string,
  startDate: Date,
  endDate: Date,
  dayPortion?: VacationDayPortion | null
): Promise<{ sufficient: boolean; years: YearBalanceCheck[] }> {
  const start = new Date(startDate)
  const end = new Date(endDate)
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)

  const years: YearBalanceCheck[] = []
  let requestedPrevYear = 0
  for (let year = start.getFullYear(); year <= end.getFullYear(); year++) {
    const segStart = start > yearStartDate(year) ? start : yearStartDate(year)
    const segEnd = end < yearEndDate(year) ? end : yearEndDate(year)
    const breakdown = await calculateVacationDaysBreakdownForUser(userId, segStart, segEnd)
    // Half-days only apply to single-day requests, which never span years
    const requested = calculateRequestedDaysFromPortion(breakdown.usedDays, start, end, dayPortion)
    if (requested > 0) {
      const available = await getYearBalance(userId, year, segEnd, requestedPrevYear)
      years.push({ year, asOf: segEnd, requested, available })
    }
    requestedPrevYear = requested
  }

  return { sufficient: years.every((y) => y.available >= y.requested), years }
}

/**
 * Human-readable explanation of the first year a request falls short in, or null if affordable.
 */
export function describeBalanceShortfall(
  check: { years: YearBalanceCheck[] },
  subject: 'you' | 'employee' = 'you'
): string | null {
  const y = check.years.find((c) => c.available < c.requested)
  if (!y) return null
  const multiYear = check.years.length > 1
  const short = (y.requested - y.available).toFixed(1)
  const when = format(y.asOf, 'MMM d, yyyy')
  const avail = `${y.available.toFixed(1)} day${y.available.toFixed(1) === '1.0' ? '' : 's'}`
  const needs = `${y.requested} day${y.requested === 1 ? '' : 's'}${multiYear ? ` in ${y.year}` : ''}`
  return subject === 'you'
    ? `You won't have enough vacation days yet. By ${when} you'll have ${avail} available${multiYear ? ` for ${y.year}` : ''}, but this request needs ${needs} — ${short} short.`
    : `Can't approve yet — by ${when} only ${avail} will be available${multiYear ? ` for ${y.year}` : ''}, but this request needs ${needs} (${short} short).`
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

    // Calculate unused days from previous year (requests spanning New Year
    // are charged only for their days within the previous year)
    const usedDays = await getUsedDaysInYear(user.id, previousYear)
    const accruedDays = await calculateAccruedDays(user.id, new Date(previousYear, 11, 31))
    const unusedDays = accruedDays + previousBalance.adjusted - usedDays

    // Only carry over positive unused days, capped at CARRYOVER_LIMIT
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
