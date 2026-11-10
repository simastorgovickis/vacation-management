'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type DayPortion = 'FULL' | 'FIRST_HALF' | 'SECOND_HALF'
type YearBalance = { year: number; asOf: string; requested: number; available: number }
type BalanceAtEnd = { asOf: string; available: number; leftOver: number }
const formatDay = (yyyyMmDd: string) =>
  new Date(yyyyMmDd + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
export default function RequestVacationPage() {
  const router = useRouter()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dayPortion, setDayPortion] = useState<DayPortion>('FULL')
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [calculatedDays, setCalculatedDays] = useState<number | null>(null)
  const [excluded, setExcluded] = useState<{ weekends: number; holidays: number } | null>(null)
  const [balanceByYear, setBalanceByYear] = useState<YearBalance[] | null>(null)
  const [balanceAtEnd, setBalanceAtEnd] = useState<BalanceAtEnd | null>(null)
  const isSingleDay = Boolean(startDate && endDate && startDate === endDate)
  const effectiveDayPortion: DayPortion = isSingleDay ? dayPortion : 'FULL'

  // Recalculate when dates change
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!startDate || !endDate) {
        setCalculatedDays(null)
        setExcluded(null)
        setBalanceByYear(null)
        setBalanceAtEnd(null)
        return
      }
      const start = new Date(startDate + 'T00:00:00')
      const end = new Date(endDate + 'T00:00:00')
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
        setCalculatedDays(null)
        setExcluded(null)
        setBalanceByYear(null)
        setBalanceAtEnd(null)
        return
      }
      try {
        const res = await fetch('/api/vacations/calculate-days', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startDate, endDate, dayPortion: effectiveDayPortion }),
        })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setCalculatedDays(null)
          setExcluded(null)
          setBalanceByYear(null)
          setBalanceAtEnd(null)
          return
        }
        setCalculatedDays(typeof data.usedDays === 'number' ? data.usedDays : null)
        setExcluded({
          weekends: typeof data.excludedWeekendDays === 'number' ? data.excludedWeekendDays : 0,
          holidays: typeof data.excludedHolidayDays === 'number' ? data.excludedHolidayDays : 0,
        })
        setBalanceByYear(Array.isArray(data.balanceByYear) ? data.balanceByYear : null)
        setBalanceAtEnd(data.balanceAtEnd ?? null)
      } catch {
        if (!cancelled) {
          setCalculatedDays(null)
          setExcluded(null)
          setBalanceByYear(null)
          setBalanceAtEnd(null)
        }
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [startDate, endDate, effectiveDayPortion])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/vacations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, dayPortion: effectiveDayPortion, comment }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create request')
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Request Vacation</CardTitle>
          <CardDescription>Submit a new vacation request</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                  }}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dayPortion">Day Portion</Label>
              <Select
                value={effectiveDayPortion}
                onValueChange={(value) => setDayPortion(value as DayPortion)}
                disabled={!isSingleDay}
              >
                <SelectTrigger id="dayPortion" className="w-full">
                  <SelectValue placeholder="Select day portion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL">Full day</SelectItem>
                  <SelectItem value="FIRST_HALF">First half</SelectItem>
                  <SelectItem value="SECOND_HALF">Second half</SelectItem>
                </SelectContent>
              </Select>
              {!isSingleDay && (
                <p className="text-sm text-gray-500">
                  Half-day is available only for single-day requests.
                </p>
              )}
            </div>

            {calculatedDays !== null && (() => {
              const hasBalance = balanceByYear !== null && balanceAtEnd !== null
              const shortYears = hasBalance
                ? balanceByYear!.filter((y) => y.available < y.requested)
                : []
              const sufficient = hasBalance && shortYears.length === 0
              const boxClass = hasBalance
                ? sufficient
                  ? 'bg-green-50 border-green-100'
                  : 'bg-red-50 border-red-100'
                : 'bg-red-50 border-red-100'
              return (
                <div className={`p-4 rounded-lg border ${boxClass}`}>
                  <p className="text-sm text-gray-700">
                    This request will use <strong>{calculatedDays} days</strong> of your vacation
                    balance.
                  </p>
                  {excluded && (excluded.weekends > 0 || excluded.holidays > 0) && (
                    <p className="text-sm text-gray-600 mt-1">
                      Not counted: {excluded.weekends} weekend day{excluded.weekends === 1 ? '' : 's'}
                      {excluded.holidays > 0 ? ` and ${excluded.holidays} public holiday${excluded.holidays === 1 ? '' : 's'}` : ''}
                      .
                    </p>
                  )}
                  {hasBalance && sufficient && (
                    <p className="text-sm text-gray-700 mt-2">
                      Projected balance by {formatDay(balanceAtEnd!.asOf)}:{' '}
                      <strong>{balanceAtEnd!.available.toFixed(1)} days</strong> — enough for this
                      request ({balanceAtEnd!.leftOver.toFixed(1)} left over).
                    </p>
                  )}
                  {hasBalance &&
                    !sufficient &&
                    shortYears.map((y) => (
                      <p key={y.year} className="text-sm text-gray-700 mt-2">
                        {balanceByYear!.length > 1 && (
                          <>
                            {y.requested} day{y.requested === 1 ? '' : 's'} fall in {y.year}.{' '}
                          </>
                        )}
                        Projected balance by {formatDay(y.asOf)}:{' '}
                        <strong>{y.available.toFixed(1)} days</strong> — not enough yet (
                        {(y.requested - y.available).toFixed(1)} short).
                      </p>
                    ))}
                </div>
              )
            })()}

            <div className="space-y-2">
              <Label htmlFor="comment">Comment (Optional)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add any additional information..."
                rows={4}
              />
            </div>

            <div className="flex gap-4">
              <Button 
                type="submit" 
                disabled={loading || !startDate || !endDate || (calculatedDays !== null && calculatedDays <= 0)}
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
