import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  if (user.role === 'ADMIN') {
    redirect('/admin')
  }

  // Managers can also access employee dashboard to request their own vacations
  // They'll be redirected to manager dashboard by default, but can access /dashboard directly
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Navbar user={user} />
          <main className="container mx-auto px-4 py-8 flex-1">{children}</main>
          <Footer />
        </div>
      )
}
