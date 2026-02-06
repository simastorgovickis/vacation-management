import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

export default async function Home() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Redirect based on role
  // Note: Managers can access both /manager and /dashboard (for their own vacations)
  if (user.role === 'ADMIN') {
    redirect('/admin')
  } else if (user.role === 'MANAGER') {
    redirect('/manager') // Default to manager dashboard, but they can navigate to /dashboard
  } else {
    redirect('/dashboard')
  }
}
