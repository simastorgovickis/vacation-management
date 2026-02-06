import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAvailableVacationDays } from '@/lib/vacation'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ProfileView } from '@/components/profile/profile-view'

export default async function ProfilePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user details with relationships
  const userDetails = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      country: {
        select: {
          name: true,
          code: true,
        },
      },
      manager: {
        include: {
          manager: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  })

  if (!userDetails) {
    redirect('/auth/login')
  }

  const availableDays = await getAvailableVacationDays(user.id)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar user={user} />
      <main className="container mx-auto px-4 py-8 flex-1">
        <ProfileView
          user={userDetails}
          availableDays={availableDays}
          manager={userDetails.manager?.[0]?.manager}
        />
      </main>
      <Footer />
    </div>
  )
}
