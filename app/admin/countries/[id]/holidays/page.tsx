'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'

interface PublicHoliday {
  id: string
  name: string
  date: string
  isRecurring: boolean
}

export default function ManageHolidaysPage() {
  const router = useRouter()
  const params = useParams()
  const countryId = params.id as string

  const [country, setCountry] = useState<{ name: string; code: string } | null>(null)
  const [holidays, setHolidays] = useState<PublicHoliday[]>([])
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    isRecurring: true,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    imported: number
    skipped: number
    importedNames: string[]
    skippedNames: string[]
  } | null>(null)

  useEffect(() => {
    fetch(`/api/countries/${countryId}`)
      .then((res) => res.json())
      .then((data) => {
        setCountry(data.country)
        setHolidays(data.country?.PublicHoliday || [])
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load country data')
        setLoading(false)
      })
  }, [countryId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const response = await fetch(`/api/countries/${countryId}/holidays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          date: formData.date,
          isRecurring: formData.isRecurring,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create holiday')
        setSaving(false)
        return
      }

      // Refresh holidays list
      fetch(`/api/countries/${countryId}`)
        .then((res) => res.json())
        .then((data) => {
          setHolidays(data.country?.PublicHoliday || [])
        })

      setFormData({ name: '', date: '', isRecurring: true })
      setSaving(false)
    } catch (err) {
      setError('An error occurred. Please try again.')
      setSaving(false)
    }
  }

  const handleDelete = async (holidayId: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) {
      return
    }

    try {
      const response = await fetch(`/api/countries/${countryId}/holidays/${holidayId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setHolidays(holidays.filter((h) => h.id !== holidayId))
      } else {
        alert('Failed to delete holiday')
      }
    } catch (error) {
      alert('An error occurred')
    }
  }

  const handleToggleRecurring = async (holidayId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/countries/${countryId}/holidays/${holidayId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRecurring: !currentStatus }),
      })

      if (response.ok) {
        // Refresh holidays list
        fetch(`/api/countries/${countryId}`)
          .then((res) => res.json())
          .then((data) => {
            setHolidays(data.country?.PublicHoliday || [])
          })
      } else {
        alert('Failed to update holiday')
      }
    } catch (error) {
      alert('An error occurred')
    }
  }

  const handleImportHolidays = async () => {
    const currentYear = new Date().getFullYear()
    const yearInput = prompt(
      `Enter year to import holidays for:\n(Default: ${currentYear})\n\nNote: Holidays are imported from OpenHolidays API and will be marked as recurring.`,
      currentYear.toString()
    )
    
    if (!yearInput) {
      return // User cancelled
    }
    
    const year = parseInt(yearInput)
    if (isNaN(year) || year < 2000 || year > 2100) {
      alert('Please enter a valid year between 2000 and 2100')
      return
    }

    setImporting(true)
    setError('')
    setImportResult(null)

    try {
      const response = await fetch(`/api/countries/${countryId}/import-holidays`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || 'Failed to import holidays'
        const suggestion = data.suggestion || ''
        setError(`${errorMsg}${suggestion ? '\n\n' + suggestion : ''}`)
        setImporting(false)
        return
      }

      if (data.imported === 0 && data.skipped === 0) {
        setError(data.error || 'No holidays were imported. Please check the country code and try again.')
        setImporting(false)
        return
      }

      setImportResult(data)
      
      // Refresh holidays list
      fetch(`/api/countries/${countryId}`)
        .then((res) => res.json())
        .then((data) => {
          setHolidays(data.country?.PublicHoliday || [])
        })

      setImporting(false)
    } catch (err) {
      setError('An error occurred while importing holidays. Please check your internet connection and try again.')
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8">
            <p>Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Manage Holidays: {country?.name}</h1>
          <p className="text-gray-600">Add and manage public holidays for {country?.name}</p>
        </div>
        <Button
          onClick={handleImportHolidays}
          disabled={importing}
          className="bg-[#eb0854] hover:bg-[#d1074a] text-white"
        >
          {importing ? '⏳ Importing...' : '📥 Import Holidays from Internet'}
        </Button>
      </div>

      {importResult && (
        <Alert className={importResult.imported > 0 ? 'border-green-500' : 'border-yellow-500'}>
          <AlertDescription>
            <strong>Import completed!</strong>
            <br />
            Imported: {importResult.imported} holidays
            {importResult.skipped > 0 && <>, Skipped: {importResult.skipped} (already exist)</>}
            {importResult.importedNames.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm">View imported holidays</summary>
                <ul className="mt-1 text-sm list-disc list-inside">
                  {importResult.importedNames.map((name, i) => (
                    <li key={i}>{name}</li>
                  ))}
                </ul>
              </details>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Add Public Holiday</CardTitle>
          <CardDescription>
            Create a new public holiday manually, or use the "Import Holidays" button above to automatically fetch holidays from the internet
          </CardDescription>
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
                <Label htmlFor="name">Holiday Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g., New Year's Day"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isRecurring"
                checked={formData.isRecurring}
                onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="isRecurring">Recurring annually</Label>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? 'Adding...' : 'Add Holiday'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Public Holidays</CardTitle>
          <CardDescription>List of public holidays for {country?.name}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Recurring</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holidays.map((holiday) => (
                <TableRow key={holiday.id}>
                  <TableCell className="font-medium">{holiday.name}</TableCell>
                  <TableCell>{format(new Date(holiday.date), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={holiday.isRecurring ? 'text-green-600' : 'text-gray-600'}>
                        {holiday.isRecurring ? 'Yes' : 'No'}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleRecurring(holiday.id, holiday.isRecurring)}
                        className="text-xs"
                      >
                        Toggle
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(holiday.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {holidays.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500">
                    No holidays added yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button variant="outline" onClick={() => router.push('/admin/countries')}>
          Back to Countries
        </Button>
      </div>
    </div>
  )
}
