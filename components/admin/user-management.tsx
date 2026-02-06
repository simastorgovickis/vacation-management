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
  employmentDate: string | null
  _count: {
    managedEmployees: number
  }
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState<string | null>(null)
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
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
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
