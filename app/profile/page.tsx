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
      Country: {
        select: {
          name: true,
          code: true,
        },
      },
      ManagerEmployee_ManagerEmployee_employeeIdToUser: {
        include: {
          User_ManagerEmployee_managerIdToUser: {
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
  const profileUser = {
    id: userDetails.id,
    name: userDetails.name,
    email: userDetails.email,
    role: userDetails.role,
    employmentDate: userDetails.employmentDate,
    country: userDetails.Country
      ? { name: userDetails.Country.name, code: userDetails.Country.code }
      : null,
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar user={user} />
      <main className="container mx-auto px-4 py-8 flex-1">
        <ProfileView
          user={profileUser}
          availableDays={availableDays}
          manager={userDetails.ManagerEmployee_ManagerEmployee_employeeIdToUser?.[0]?.User_ManagerEmployee_managerIdToUser}
        />
      </main>
      <Footer />
    </div>
  )
}
