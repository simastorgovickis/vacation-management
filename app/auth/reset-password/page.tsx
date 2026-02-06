'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

function ResetPasswordPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)

  useEffect(() => {
    // Validate token
    if (token) {
      fetch(`/api/auth/validate-reset-token?token=${token}`)
        .then((res) => res.json())
        .then((data) => {
          setTokenValid(data.valid || false)
          setValidating(false)
          if (!data.valid) {
            setError('Invalid or expired reset token')
          }
        })
        .catch(() => {
          setTokenValid(false)
          setValidating(false)
          setError('Failed to validate reset token')
        })
    } else {
      setValidating(false)
      setError('No reset token provided')
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword: passwordData.newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to reset password')
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/auth/login')
      }, 2000)
    } catch (err) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  if (validating) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <div className="flex-1 flex items-center justify-center px-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardContent className="p-8">
              <p className="text-center">Validating reset token...</p>
            </CardContent>
          </Card>
        </div>
        <footer className="border-t bg-white py-4">
          <div className="container mx-auto px-4">
            <p className="text-center text-sm text-gray-600">
              © Rail Europe {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex-1 flex items-center justify-center px-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <img src="/logo.png" alt="Rail Europe" className="h-12 w-auto" />
            </div>
            <div className="text-center">
              <CardTitle className="text-2xl">Reset Password</CardTitle>
              <CardDescription className="mt-2">Enter your new password</CardDescription>
            </div>
          </CardHeader>
        <CardContent>
          {success ? (
            <Alert className="border-green-500">
              <AlertDescription className="text-green-700">
                Password reset successfully! Redirecting to login...
              </AlertDescription>
            </Alert>
          ) : tokenValid ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password *</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  minLength={6}
                />
                <p className="text-sm text-gray-500">Must be at least 6 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  required
                  minLength={6}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          ) : (
            <Alert variant="destructive">
              <AlertDescription>{error || 'Invalid or expired reset token'}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      </div>
      <footer className="border-t bg-white py-4">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-gray-600">
            © Rail Europe {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col bg-gray-50">
          <div className="flex-1 flex items-center justify-center px-4">
            <Card className="w-full max-w-md shadow-lg">
              <CardContent className="p-8">
                <p className="text-center">Loading...</p>
              </CardContent>
            </Card>
          </div>
          <footer className="border-t bg-white py-4">
            <div className="container mx-auto px-4">
              <p className="text-center text-sm text-gray-600">© Rail Europe {new Date().getFullYear()}</p>
            </div>
          </footer>
        </div>
      }
    >
      <ResetPasswordPageInner />
    </Suspense>
  )
}
