import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { CountryManagement } from '@/components/admin/country-management'

export default async function CountriesPage() {
  await requireRole(['ADMIN'])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Countries & Holidays</h1>
          <p className="text-gray-600">Manage countries and public holidays</p>
        </div>
        <Button asChild>
          <Link href="/admin/countries/new">Create Country</Link>
        </Button>
      </div>

      <CountryManagement />
    </div>
  )
}
