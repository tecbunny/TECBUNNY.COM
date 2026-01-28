import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

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
  let correlationId = requestHeaders.get('x-correlation-id') || crypto.randomUUID()
  requestHeaders.set('x-correlation-id', correlationId)

  const pathname = request.nextUrl.pathname
  let response = NextResponse.next({ request: { headers: requestHeaders } })

  // Supabase Auth & Session Management
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser()

  // Protect Management Routes
  if (pathname.startsWith('/management') && !user) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  const applySharedHeaders = () => {
    // Add cache-control headers to prevent caching of auth-related pages
    if (pathname.startsWith('/management') || pathname.startsWith('/auth')) {
      response.headers.set('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
    }

    if (
      pathname.startsWith('/management') ||
      pathname.startsWith('/auth') ||
      pathname.startsWith('/checkout') ||
      pathname.startsWith('/cart') ||
      pathname.startsWith('/profile')
    ) {
      response.headers.set('X-Robots-Tag', 'noindex, nofollow')
    }

    // Global security headers (basic hardening)
    response.headers.set('X-Frame-Options', 'SAMEORIGIN')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    // Minimal CSP (can be expanded later)
    const csp = [
      "default-src 'self'",
      "img-src 'self' data: https:",
      // Allow Cloudflare Turnstile scripts and analytics beacon
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://*.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline'",
      // Allow API calls to any https, Turnstile verification, and analytics beacon uploads
      "connect-src 'self' https: https://*.cloudflareinsights.com",
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

  return applySharedHeaders()
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
