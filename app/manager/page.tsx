import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAvailableVacationDays } from '@/lib/vacation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { VacationRequestList } from '@/components/vacation/vacation-request-list'
import { TeamVacationCalendar } from '@/components/vacation/team-vacation-calendar'

export default async function ManagerDashboard() {
  const manager = await requireRole(['MANAGER', 'ADMIN'])

  // Get team members
  const teamRelations = await prisma.managerEmployee.findMany({
    where: { managerId: manager.id },
    include: {
      User_ManagerEmployee_employeeIdToUser: true,
    },
  })

  const teamMemberIds = teamRelations.map((t) => t.employeeId)
  // Include manager's own ID so they can see their own vacations too
  const allMemberIds = [...teamMemberIds, manager.id]

  // Get pending requests from team (excluding manager's own requests - they handle those as employee)
  const pendingRequests = await prisma.vacationRequest.findMany({
    where: {
      userId: { in: teamMemberIds }, // Only team members, not manager's own
      status: { in: ['PENDING', 'CANCELLATION_REQUESTED'] },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Get all team vacations (excluding cancelled) - includes manager's own vacations
  const allTeamVacations = await prisma.vacationRequest.findMany({
    where: {
      userId: { in: allMemberIds }, // Includes manager's own vacations
      status: { not: 'CANCELLED' }, // Exclude cancelled requests
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Get balances for team members
  const teamBalances = await Promise.all(
    teamRelations.map(async (rel) => {
      const available = await getAvailableVacationDays(rel.employeeId)
      return {
        employee: rel.User_ManagerEmployee_employeeIdToUser,
        available,
      }
    })
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Manager Dashboard</h1>
        <p className="text-gray-600">Team vacation overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Team Members</CardTitle>
            <CardDescription className="text-xs">Direct reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{teamMemberIds.length}</div>
            <p className="text-sm text-gray-500 mt-1">employees</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow border-[#eb0854]/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Pending Approvals</CardTitle>
            <CardDescription className="text-xs">Awaiting your review (requests & cancellations)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#eb0854]">{pendingRequests.length}</div>
            <p className="text-sm text-gray-500 mt-1">requests</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Team Vacations</CardTitle>
            <CardDescription className="text-xs">Active team requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{allTeamVacations.length}</div>
            <p className="text-sm text-gray-500 mt-1">active requests</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Team Member Balances</CardTitle>
          <CardDescription>Available vacation days per team member</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {teamBalances.map(({ employee, available }) => (
              <div
                key={employee.id}
                className="flex justify-between items-center p-3 border rounded-lg"
              >
                <div>
                  <div className="font-medium">{employee.name}</div>
                  <div className="text-sm text-gray-500">{employee.email}</div>
                </div>
                <div className="text-lg font-semibold">{available.toFixed(1)} days</div>
              </div>
            ))}
            {teamBalances.length === 0 && (
              <p className="text-gray-500">No team members assigned yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Team Calendar</CardTitle>
            <CardDescription>All team vacations</CardDescription>
          </CardHeader>
          <CardContent>
            <TeamVacationCalendar vacations={allTeamVacations} teamMemberIds={allMemberIds} />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>Review and approve vacation requests and cancellation requests</CardDescription>
          </CardHeader>
          <CardContent>
            <VacationRequestList vacations={pendingRequests} showActions={true} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
