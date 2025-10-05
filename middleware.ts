import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { randomUUID } from 'crypto'

export async function middleware(request: NextRequest) {
  // Define public API routes that don't require authentication
  const publicApiRoutes = [
    '/api/settings',
    '/api/page-content',
    '/api/auto-offers',
    '/api/coupons',
    '/api/products',
    '/api/products/csv',
    '/api/products/template',
    '/api/products/export'
  ]
  
  // Check if the current path is in the public API routes
  const isPublicApiRoute = publicApiRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )
  
  // If it's a public API route, allow access without authentication
  if (isPublicApiRoute) {
    return NextResponse.next()
  }

  const requestHeaders = new Headers(request.headers)
  // Correlation ID
  let correlationId = requestHeaders.get('x-correlation-id') || randomUUID()
  requestHeaders.set('x-correlation-id', correlationId)

  let response = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({ request: { headers: requestHeaders } })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({ request: { headers: requestHeaders } })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if it exists - this prevents automatic logouts
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session) {
      // Try to refresh the session to prevent token expiry
      await supabase.auth.refreshSession()
    }
  } catch (error) {
    console.error('Middleware session refresh error:', error)
  }

  // Add cache-control headers to prevent caching of auth-related pages
  if (request.nextUrl.pathname.startsWith('/management') || 
      request.nextUrl.pathname.startsWith('/auth')) {
    response.headers.set('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
  }

  // Global security headers (basic hardening)
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  // Minimal CSP (can be expanded later)
  // Basic nonce (not applied to actual inline scripts yet; placeholder for future embedding)
  const csp = [
    "default-src 'self'",
    "img-src 'self' data: https:",
    // Allow Cloudflare Turnstile scripts
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    // Allow API calls to any https and Turnstile verification
    "connect-src 'self' https:",
    "font-src 'self' data:",
    // Permit Turnstile widget iframe
    "frame-src 'self' https://challenges.cloudflare.com",
    "frame-ancestors 'self'",
    "object-src 'none'",
  ].join('; ')
  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('X-Correlation-Id', correlationId)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
