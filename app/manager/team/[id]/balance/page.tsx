 'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface BalanceData {
  available: number
  used: number
  adjusted: number
}

interface UserSummary {
  id: string
  name: string
  email: string
}

export default function ManagerEmployeeBalancePage() {
  const params = useParams()
  const router = useRouter()
  const employeeId = params.id as string

  const [employee, setEmployee] = useState<UserSummary | null>(null)
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null)
  const [adjustment, setAdjustment] = useState({ amount: '', reason: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        // Load employee info (manager sees only their team via this API)
        const usersRes = await fetch('/api/users')
        const usersData = await usersRes.json()
        const user = (usersData.users || []).find((u: any) => u.id === employeeId)
        if (!user) {
          if (!cancelled) {
            setError('Employee not found or not in your team.')
            setLoading(false)
          }
          return
        }
        if (!cancelled) {
          setEmployee({ id: user.id, name: user.name, email: user.email })
        }

        // Load current balance
        const balRes = await fetch(`/api/balances/${employeeId}`)
        const balData = await balRes.json()
        if (!balRes.ok) {
          if (!cancelled) {
            setError(balData.error || 'Failed to load vacation balance.')
            setLoading(false)
          }
          return
        }
        if (!cancelled) {
          setBalanceData({
            available: balData.available || 0,
            used: balData.used || 0,
            adjusted: balData.adjusted || 0,
          })
          setLoading(false)
        }
      } catch (e) {
        if (!cancelled) {
          setError('An error occurred while loading data.')
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [employeeId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const normalizedAmount = parseFloat(adjustment.amount.replace(',', '.'))
      if (Number.isNaN(normalizedAmount)) {
        setError('Please enter a valid number for adjustment amount (e.g., 1.5 or -2)')
        setSaving(false)
        return
      }

      const response = await fetch(`/api/balances/${employeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: normalizedAmount,
          reason: adjustment.reason,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to adjust balance')
        setSaving(false)
        return
      }

      // Refresh balance
      const balRes = await fetch(`/api/balances/${employeeId}`)
      const balData = await balRes.json()
      if (balRes.ok) {
        setBalanceData({
          available: balData.available || 0,
          used: balData.used || 0,
          adjusted: balData.adjusted || 0,
        })
      }

      setAdjustment({ amount: '', reason: '' })
      setSaving(false)
    } catch (e) {
      setError('An error occurred while adjusting balance.')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8">
            <p>Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!employee || !balanceData) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8 space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button variant="outline" onClick={() => router.push('/manager')}>
              Back to Manager Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Vacation Balance</CardTitle>
          <CardDescription>
            Manual adjustments for {employee.name} ({employee.email})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                <div className="text-sm text-[#eb0854] font-medium">Available</div>
                <div className="text-2xl font-bold text-gray-900">
                  {balanceData.available.toFixed(1)} days
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-600 font-medium">Used</div>
                <div className="text-2xl font-bold text-gray-900">
                  {balanceData.used.toFixed(1)} days
                </div>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                <div className="text-sm text-amber-700 font-medium">Manual Adjustments</div>
                <div className="text-2xl font-bold text-gray-900">
                  {balanceData.adjusted.toFixed(1)} days
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="adjustmentAmount">Adjustment Amount</Label>
                  <Input
                    id="adjustmentAmount"
                    type="number"
                    step="0.1"
                    placeholder="e.g., +5 or -2"
                    value={adjustment.amount}
                    onChange={(e) =>
                      setAdjustment({ ...adjustment, amount: e.target.value })
                    }
                  />
                  <p className="text-sm text-gray-500">
                    Use positive number to add days, negative to subtract
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adjustmentReason">Reason *</Label>
                  <Textarea
                    id="adjustmentReason"
                    placeholder="e.g., Carryover from previous year, correction, etc."
                    value={adjustment.reason}
                    onChange={(e) =>
                      setAdjustment({ ...adjustment, reason: e.target.value })
                    }
                    required
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={saving || !adjustment.amount}>
                  {saving ? 'Adjusting...' : 'Adjust Balance'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/manager')}
                >
                  Back to Manager Dashboard
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

