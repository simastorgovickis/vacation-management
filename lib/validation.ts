import { z } from 'zod'

/**
 * Validation schemas for API inputs
 */

export const emailSchema = z.string().email('Invalid email format').min(1, 'Email is required')

export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters long')
  .max(100, 'Password is too long')

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(200, 'Name is too long')
  .trim()

export const roleSchema = z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE'] as const, {
  message: 'Invalid role',
})

export const dateSchema = z.coerce.date().refine(
  (date) => !isNaN(date.getTime()),
  { message: 'Invalid date format' }
)

export const employmentDateSchema = dateSchema.refine(
  (date) => date <= new Date(),
  { message: 'Employment date cannot be in the future' }
)

export const vacationDateSchema = z.object({
  startDate: dateSchema,
  endDate: dateSchema,
}).refine(
  (data) => data.startDate <= data.endDate,
  {
    message: 'Start date must be before end date',
    path: ['endDate'],
  }
)

export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  role: roleSchema,
  employmentDate: employmentDateSchema.optional().nullable(),
  yearlyAllowance: z.coerce.number().min(0).max(365).optional().nullable(),
  initialBalance: z.coerce.number().optional().nullable(),
})

export const updateUserSchema = z.object({
  email: emailSchema.optional(),
  name: nameSchema.optional(),
  role: roleSchema.optional(),
  employmentDate: employmentDateSchema.optional().nullable(),
  yearlyAllowance: z.coerce.number().min(0).max(365).optional().nullable(),
  slackNotificationsEnabled: z.coerce.boolean().optional(),
  // IDs are Prisma string IDs (cuid), not strict UUIDs
  managerId: z.string().min(1).optional().nullable(),
  countryId: z.string().min(1).optional().nullable(),
})

export const createVacationSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  dayPortion: z.enum(['FULL', 'FIRST_HALF', 'SECOND_HALF']).optional().nullable(),
  comment: z.string().max(1000, 'Comment is too long').optional().nullable(),
}).refine(
  (data) => {
    const start = new Date(data.startDate + 'T00:00:00')
    const end = new Date(data.endDate + 'T00:00:00')
    return start <= end
  },
  {
    message: 'Start date must be before end date',
    path: ['endDate'],
  }
)

export const updateVacationSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'CANCELLATION_REQUESTED']),
  rejectionReason: z.string().max(500, 'Rejection reason is too long').optional().nullable(),
})

export const adjustBalanceSchema = z.object({
  amount: z.coerce.number().finite('Amount must be a valid number'),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason is too long').trim(),
})

export const changePasswordSchema = z.object({
  currentPassword: passwordSchema,
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
)

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
)

export const createCountrySchema = z.object({
  name: z.string().min(1, 'Country name is required').max(100, 'Country name is too long').trim(),
  code: z.string().length(2, 'Country code must be 2 characters').toUpperCase(),
  regionCode: z
    .string()
    .min(3, 'Region code is too short')
    .max(20, 'Region code is too long')
    .regex(/^[A-Za-z0-9-]+$/, 'Region code can only contain letters, numbers and dashes')
    .optional()
    .nullable(),
})

export const createHolidaySchema = z.object({
  name: z.string().min(1, 'Holiday name is required').max(200, 'Holiday name is too long').trim(),
  date: dateSchema,
  isRecurring: z.boolean().optional().default(false),
})

export const importHolidaysSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
})
