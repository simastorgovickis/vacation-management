import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createCountrySchema } from '@/lib/validation'

// GET /api/countries - List all countries
export async function GET() {
  try {
    const countries = await prisma.country.findMany({
      include: {
        _count: {
          select: {
            users: true,
            publicHolidays: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ countries })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/countries - Create country (Admin only)
export async function POST(request: NextRequest) {
  try {
    await requireRole(['ADMIN'])
    const { name, code } = await request.json()

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      )
    }

    const country = await prisma.country.create({
      data: {
        name,
        code: code.toUpperCase(),
      },
    })

    return NextResponse.json({ country }, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Country with this name or code already exists' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
