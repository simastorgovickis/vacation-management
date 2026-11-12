import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { mustChangePassword, SET_PASSWORD_PATH } from '@/lib/password-reset'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it so that users
  // have to sign in again every time they visit a page.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect routes (allow auth routes and API routes)
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/api/auth')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Users signed in with an admin-issued temporary password must set a new one
  // before doing anything else (only the set-password page/API and logout stay open)
  if (user && mustChangePassword(user)) {
    const path = request.nextUrl.pathname
    const allowed =
      path === SET_PASSWORD_PATH ||
      path === '/api/auth/set-password' ||
      path === '/api/auth/logout' ||
      path === '/auth/login' ||
      path === '/api/auth/login'
    if (!allowed) {
      if (path.startsWith('/api/')) {
        const res = NextResponse.json(
          { error: 'You must set a new password before continuing.' },
          { status: 403 }
        )
        supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c))
        return res
      }
      const url = request.nextUrl.clone()
      url.pathname = SET_PASSWORD_PATH
      url.search = ''
      const res = NextResponse.redirect(url)
      supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c))
      return res
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse
}
