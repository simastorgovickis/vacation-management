'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function SetPasswordPage() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword, confirmPassword }),
      })
      const data = await response.json()
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login')
          return
        }
        setError(data.error || 'Failed to set password')
        setLoading(false)
        return
      }
      router.push('/')
      router.refresh()
    } catch {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <img src="/logo.png" alt="Rail Europe" className="h-12 w-auto" />
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl">Set your new password</CardTitle>
            <CardDescription className="mt-2">
              You signed in with a temporary password. Choose a new one to continue.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500">At least 6 characters.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Saving...' : 'Save and continue'}
            </Button>
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full text-center text-sm text-gray-500 hover:underline"
            >
              Sign out
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
