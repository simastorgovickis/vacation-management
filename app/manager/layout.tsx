import { getCurrentUser, requireRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireRole(['MANAGER', 'ADMIN'])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar user={user} />
      <main className="container mx-auto px-4 py-8 flex-1">{children}</main>
      <Footer />
    </div>
  )
}
