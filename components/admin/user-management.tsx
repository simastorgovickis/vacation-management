'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

interface User {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  employmentDate: string | null
  _count: {
    managedEmployees: number
  }
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState<string | null>(null)
  const [togglingActive, setTogglingActive] = useState<string | null>(null)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [resetPassword, setResetPassword] = useState<{ email: string; password: string } | null>(null)

  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleResetPassword = async (userId: string, userEmail: string) => {
    if (!confirm(`Reset password for ${userEmail}? A new password will be generated.`)) {
      return
    }

    setResetting(userId)

    try {
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Failed to reset password')
        setResetting(null)
        return
      }

      // Show dialog with the new password
      setResetPassword({ email: userEmail, password: data.password })
      setShowPasswordDialog(true)
      setResetting(null)
    } catch (error) {
      alert('An error occurred. Please try again.')
      setResetting(null)
    }
  }

  const handleToggleActive = async (userId: string, currentlyActive: boolean) => {
    const action = currentlyActive ? 'deactivate' : 'reactivate'
    if (!confirm(`Are you sure you want to ${action} this user?`)) return

    setTogglingActive(userId)
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentlyActive }),
      })
      const data = await response.json()
      if (!response.ok) {
        alert(data.error || `Failed to ${action} user`)
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isActive: !currentlyActive } : u))
        )
      }
    } catch {
      alert('An error occurred. Please try again.')
    }
    setTogglingActive(null)
  }

  const copyPasswordToClipboard = () => {
    if (resetPassword) {
      navigator.clipboard.writeText(resetPassword.password)
      alert('Password copied to clipboard!')
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800'
      case 'MANAGER':
        return 'bg-red-100 text-red-800'
      case 'EMPLOYEE':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return <p>Loading...</p>
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Employment Date</TableHead>
              <TableHead>Team Size</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className={user.isActive ? '' : 'opacity-50'}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {user.name}
                    {!user.isActive && (
                      <Badge className="bg-gray-100 text-gray-500 text-xs">Deactivated</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge className={getRoleColor(user.role)}>{user.role}</Badge>
                </TableCell>
                <TableCell>
                  {user.employmentDate
                    ? new Date(user.employmentDate).toLocaleDateString()
                    : 'Not set'}
                </TableCell>
                <TableCell>{user._count.managedEmployees}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/users/${user.id}`}>Edit</Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetPassword(user.id, user.email)}
                      disabled={resetting === user.id}
                    >
                      {resetting === user.id ? 'Resetting...' : 'Reset Password'}
                    </Button>
                    <Button
                      variant={user.isActive ? 'destructive' : 'outline'}
                      size="sm"
                      onClick={() => handleToggleActive(user.id, user.isActive)}
                      disabled={togglingActive === user.id}
                    >
                      {togglingActive === user.id
                        ? '...'
                        : user.isActive
                          ? 'Deactivate'
                          : 'Reactivate'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Reset Successful</DialogTitle>
            <DialogDescription>
              A new password has been generated for {resetPassword?.email}. Please share this password with the user securely.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={resetPassword?.password || ''}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button onClick={copyPasswordToClipboard} variant="outline">
                  Copy
                </Button>
              </div>
            </div>
            <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> The user should log in with this password and change it immediately from their profile page.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setShowPasswordDialog(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
