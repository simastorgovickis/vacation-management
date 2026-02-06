import { getCurrentUser, requireAuth } from '@/lib/auth'
import { getAvailableVacationDays } from '@/lib/vacation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { VacationCalendar } from '@/components/vacation/vacation-calendar'
import { VacationRequestList } from '@/components/vacation/vacation-request-list'

export default async function EmployeeDashboard() {
  const user = await requireAuth()
  const available = await getAvailableVacationDays(user.id)

  const myVacations = await prisma.vacationRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  const pendingCount = myVacations.filter((v) => v.status === 'PENDING').length
  const upcomingVacations = myVacations.filter(
    (v) => v.status === 'APPROVED' && new Date(v.startDate) >= new Date()
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user.name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm hover:shadow-md transition-shadow border-[#eb0854]/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Available Days</CardTitle>
            <CardDescription className="text-xs">Vacation days you can use</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#eb0854]">{available.toFixed(1)}</div>
            <p className="text-sm text-gray-500 mt-1">days</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Pending Requests</CardTitle>
            <CardDescription className="text-xs">Awaiting approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{pendingCount}</div>
            <p className="text-sm text-gray-500 mt-1">requests</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Upcoming Vacations</CardTitle>
            <CardDescription className="text-xs">Approved and scheduled</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{upcomingVacations.length}</div>
            <p className="text-sm text-gray-500 mt-1">vacations</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Request Vacation</h2>
        <Button asChild>
          <Link href="/dashboard/request">New Request</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
            <CardDescription>Your vacation schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <VacationCalendar userId={user.id} />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Recent Requests</CardTitle>
            <CardDescription>Your vacation requests</CardDescription>
          </CardHeader>
          <CardContent>
            <VacationRequestList vacations={myVacations} showCancel={true} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
