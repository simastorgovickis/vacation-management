import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { UserManagement } from '@/components/admin/user-management'
import { AuditLogs } from '@/components/admin/audit-logs'

export default async function AdminDashboard() {
  const admin = await requireRole(['ADMIN'])

  const stats = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'EMPLOYEE' } }),
    prisma.user.count({ where: { role: 'MANAGER' } }),
    prisma.vacationRequest.count({ where: { status: 'PENDING' } }),
    prisma.vacationRequest.count(),
  ])

  const [totalUsers, employees, managers, pendingRequests, totalRequests] = stats

  // Check if admin is also a manager (has employees assigned)
  const teamRelations = await prisma.managerEmployee.findMany({
    where: { managerId: admin.id },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  const isManager = teamRelations.length > 0
  const teamMemberIds = teamRelations.map((t) => t.employeeId)

  // Get pending requests from admin's team (if they're a manager)
  const teamPendingRequests = isManager
    ? await prisma.vacationRequest.findMany({
        where: {
          userId: { in: teamMemberIds },
          status: 'PENDING',
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
        take: 5, // Show top 5
      })
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-600">System administration</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Total Users</CardTitle>
            <CardDescription className="text-xs">All system users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{totalUsers}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Employees</CardTitle>
            <CardDescription className="text-xs">Regular employees</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{employees}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Managers</CardTitle>
            <CardDescription className="text-xs">Team managers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{managers}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow border-[#eb0854]/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Pending Requests</CardTitle>
            <CardDescription className="text-xs">Awaiting approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[#eb0854]">{pendingRequests}</div>
          </CardContent>
        </Card>
      </div>

      {isManager && (
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>My Team ({teamRelations.length} members)</CardTitle>
                <CardDescription>You are also a manager - manage your team's vacations</CardDescription>
              </div>
              <Button asChild>
                <Link href="/manager">Go to Manager Dashboard</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Team Members:</h3>
                <div className="space-y-1">
                  {teamRelations.map((rel) => (
                    <div key={rel.id} className="text-sm">
                      • {rel.employee.name} ({rel.employee.email})
                    </div>
                  ))}
                </div>
              </div>
              {teamPendingRequests.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Pending Team Requests ({teamPendingRequests.length}):</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    {teamPendingRequests.map((req) => (
                      <div key={req.id}>
                        • {req.user.name}: {new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}
                      </div>
                    ))}
                    {teamPendingRequests.length === 5 && (
                      <div className="text-xs text-gray-500 italic">...and more (see Manager Dashboard)</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">User Management</h2>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/countries">Countries & Holidays</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/users/new">Create User</Link>
          </Button>
        </div>
      </div>

      <UserManagement />

      <div>
        <h2 className="text-2xl font-semibold mb-4">Audit Logs</h2>
        <AuditLogs />
      </div>
    </div>
  )
}
