import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { isTemporaryPasswordExpired, mustChangePassword } from '@/lib/password-reset'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: { isActive: true },
    })

    if (dbUser && !dbUser.isActive) {
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: 'Your account has been deactivated. Please contact your administrator.' },
        { status: 403 }
      )
    }

    if (isTemporaryPasswordExpired(data.user)) {
      await supabase.auth.signOut()
      return NextResponse.json(
        {
          error:
            'Your temporary password has expired. Please ask your administrator to reset it again.',
        },
        { status: 401 }
      )
    }

    return NextResponse.json({
      user: data.user,
      mustChangePassword: mustChangePassword(data.user),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
