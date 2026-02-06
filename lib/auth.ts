import { createClient } from './supabase/server'
import { prisma } from './prisma'
import type { Role } from '@/lib/generated/prisma/enums'

export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser()

  if (!supabaseUser) {
    return null
  }

  // Get user from our database
  const user = await prisma.user.findUnique({
    where: { email: supabaseUser.email! },
  })

  return user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export async function requireRole(allowedRoles: Role[]) {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Forbidden')
  }
  return user
}

export async function canAccessEmployeeData(
  currentUser: { id: string; role: Role },
  targetUserId: string
) {
  // Admin can access all
  if (currentUser.role === 'ADMIN') {
    return true
  }

  // Users can access their own data
  if (currentUser.id === targetUserId) {
    return true
  }

  // Managers can access their team members' data
  if (currentUser.role === 'MANAGER') {
    const relationship = await prisma.managerEmployee.findUnique({
      where: {
        managerId_employeeId: {
          managerId: currentUser.id,
          employeeId: targetUserId,
        },
      },
    })
    return !!relationship
  }

  return false
}
