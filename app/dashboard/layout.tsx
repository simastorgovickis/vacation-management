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

  // Managers and admins can access /dashboard to request their own vacations
  // (Admins get "My Vacations" in navbar; default home for admin is still /admin)
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Navbar user={user} />
          <main className="container mx-auto px-4 py-8 flex-1">{children}</main>
          <Footer />
        </div>
      )
}
