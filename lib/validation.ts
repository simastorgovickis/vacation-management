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
  startDate: dateSchema.refine(
    (date) => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return date >= today
    },
    { message: 'Cannot request vacation in the past' }
  ),
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
  initialBalance: z.coerce.number().optional().nullable(),
})

export const updateUserSchema = z.object({
  name: nameSchema.optional(),
  role: roleSchema.optional(),
  employmentDate: employmentDateSchema.optional().nullable(),
  managerId: z.string().uuid().optional().nullable(),
  countryId: z.string().uuid().optional().nullable(),
})

export const createVacationSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
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
).refine(
  (data) => {
    const start = new Date(data.startDate + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return start >= today
  },
  {
    message: 'Cannot request vacation in the past',
    path: ['startDate'],
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
})

export const createHolidaySchema = z.object({
  name: z.string().min(1, 'Holiday name is required').max(200, 'Holiday name is too long').trim(),
  date: dateSchema,
  isRecurring: z.boolean().optional().default(false),
})

export const importHolidaysSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
})
