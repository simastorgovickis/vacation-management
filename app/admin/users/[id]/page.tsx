'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'

export default function EditUserPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  const [formData, setFormData] = useState({
    name: '',
    role: '',
    employmentDate: '',
    managerId: '',
    countryId: '',
  })
  const [balanceData, setBalanceData] = useState({
    available: 0,
    used: 0,
    adjusted: 0,
  })
  const [balanceAdjustment, setBalanceAdjustment] = useState({
    amount: '',
    reason: '',
  })
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([])
  const [countries, setCountries] = useState<{ id: string; name: string; code: string }[]>([])
  const [currentManager, setCurrentManager] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [adjustingBalance, setAdjustingBalance] = useState(false)

  useEffect(() => {
    // Fetch user data
    fetch(`/api/users`)
      .then((res) => res.json())
      .then((data) => {
        const user = data.users?.find((u: any) => u.id === userId)
        if (user) {
          setFormData({
            name: user.name,
            role: user.role,
            employmentDate: user.employmentDate
              ? new Date(user.employmentDate).toISOString().split('T')[0]
              : '',
            managerId: '',
            countryId: user.countryId || '',
          })
          // Fetch current manager assignment
          fetch(`/api/users/${userId}/manager`)
            .then((res) => res.json())
            .then((managerData) => {
              if (managerData.managerId) {
                setCurrentManager(managerData.managerId)
                setFormData((prev) => ({ ...prev, managerId: managerData.managerId }))
              }
            })
            .catch(() => {})
          
          // Fetch vacation balance
          fetch(`/api/balances/${userId}`)
            .then((res) => res.json())
            .then((balanceData) => {
              if (balanceData) {
                setBalanceData({
                  available: balanceData.available || 0,
                  used: balanceData.used || 0,
                  adjusted: balanceData.adjusted || 0,
                })
              }
            })
            .catch(() => {})
        }
        // Get managers list
        const managerList = data.users?.filter((u: any) => u.role === 'MANAGER' || u.role === 'ADMIN')
        setManagers(managerList || [])
        
        // Fetch countries list
        fetch('/api/countries')
          .then((res) => res.json())
          .then((countriesData) => {
            setCountries(countriesData.countries || [])
          })
          .catch(() => {})
        
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load user data')
        setLoading(false)
      })
  }, [userId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          employmentDate: formData.employmentDate,
          managerId: formData.managerId && formData.managerId !== 'none' ? formData.managerId : null,
          countryId: formData.countryId && formData.countryId !== 'none' ? formData.countryId : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to update user')
        setSaving(false)
        return
      }

      router.push('/admin')
      router.refresh()
    } catch (err) {
      setError('An error occurred. Please try again.')
      setSaving(false)
    }
  }

  const handleBalanceAdjustment = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setAdjustingBalance(true)

    try {
      const response = await fetch(`/api/balances/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(balanceAdjustment.amount),
          reason: balanceAdjustment.reason,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to adjust balance')
        setAdjustingBalance(false)
        return
      }

      // Refresh balance data
      fetch(`/api/balances/${userId}`)
        .then((res) => res.json())
        .then((balanceData) => {
          if (balanceData) {
            setBalanceData({
              available: balanceData.available || 0,
              used: balanceData.used || 0,
              adjusted: balanceData.adjusted || 0,
            })
          }
        })
        .catch(() => {})

      setBalanceAdjustment({ amount: '', reason: '' })
      setAdjustingBalance(false)
    } catch (err) {
      setError('An error occurred. Please try again.')
      setAdjustingBalance(false)
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

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Edit User</CardTitle>
          <CardDescription>Update user information and assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employmentDate">Employment Date *</Label>
              <Input
                id="employmentDate"
                type="date"
                value={formData.employmentDate}
                onChange={(e) => setFormData({ ...formData, employmentDate: e.target.value })}
                required
              />
              <p className="text-sm text-gray-500">Vacation accrual start date</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="countryId">Country (for public holidays)</Label>
              <Select
                value={formData.countryId || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, countryId: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a country (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No country</SelectItem>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      {country.name} ({country.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                Assign a country to show public holidays on this user's calendar
              </p>
            </div>

            {(formData.role === 'EMPLOYEE' || formData.role === 'MANAGER') && (
              <div className="space-y-2">
                <Label htmlFor="managerId">Assign to Manager</Label>
                <Select
                  value={formData.managerId || 'none'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, managerId: value === 'none' ? '' : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a manager (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No manager</SelectItem>
                    {managers
                      .filter((m) => m.id !== userId) // Can't assign to self
                      .map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  Assign this user to a manager for vacation approvals (managers can also be employees)
                </p>
              </div>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Vacation Balance Adjustment Section */}
      <Card className="mt-6 shadow-sm">
        <CardHeader>
          <CardTitle>Vacation Balance</CardTitle>
          <CardDescription>Adjust vacation balance for this user</CardDescription>
        </CardHeader>
        <CardContent>
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
                <p className="text-xs text-gray-600">days</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                <div className="text-sm text-amber-700 font-medium">Manual Adjustments</div>
                <div className="text-2xl font-bold text-gray-900">
                  {balanceData.adjusted.toFixed(1)} days
                </div>
                <p className="text-xs text-gray-600">days</p>
              </div>
            </div>

            <form onSubmit={handleBalanceAdjustment} className="space-y-4 border-t pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="adjustmentAmount">Adjustment Amount</Label>
                  <Input
                    id="adjustmentAmount"
                    type="number"
                    step="0.1"
                    placeholder="e.g., +5 or -2"
                    value={balanceAdjustment.amount}
                    onChange={(e) =>
                      setBalanceAdjustment({ ...balanceAdjustment, amount: e.target.value })
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
                    placeholder="e.g., Carryover from previous year, Manual adjustment, etc."
                    value={balanceAdjustment.reason}
                    onChange={(e) =>
                      setBalanceAdjustment({ ...balanceAdjustment, reason: e.target.value })
                    }
                    required
                    rows={2}
                  />
                </div>
              </div>
              <Button type="submit" disabled={adjustingBalance || !balanceAdjustment.amount}>
                {adjustingBalance ? 'Adjusting...' : 'Adjust Balance'}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
