// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

// Middleware runs on every request matched by `config.matcher` below.
// It acts as a route guard, protecting dashboard pages from unauthenticated access.
export async function middleware(request: NextRequest) {
  // Extract the pathname from the incoming request URL (e.g. "/dashboard/payments")
  const { pathname } = request.nextUrl

  // Only apply auth logic to routes under /dashboard
  if (pathname.startsWith('/dashboard')) {
    // Look for the session cookie set at login time
    const sessionCookie = request.cookies.get('session')

    // No session cookie present — redirect immediately to login
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
      // Verify the JWT / session token and extract the user payload
      const payload = await verifyToken(sessionCookie.value)

      // Token is valid — allow the request to continue
      const response = NextResponse.next()

      // Forward user identity to downstream route handlers via request headers.
      // These headers can be read inside page/API route handlers without
      // re-verifying the token on every request.
      response.headers.set('x-user-role', payload.role)
      response.headers.set('x-user-email', payload.email)

      return response
    } catch {
      // Token is invalid or expired — clear the stale cookie and redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('session')
      return response
    }
  }

  // Route is not protected — let the request pass through unchanged
  return NextResponse.next()
}

// Tells Next.js which paths this middleware should run on.
// `/dashboard/:path*` matches /dashboard and any nested route beneath it.
export const config = {
  matcher: ['/dashboard/:path*'],
}
