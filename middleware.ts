import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// /admin y la ruta vieja /admin-dm2026 redirigen a la ruta oficial /ADMIN
export function middleware(request: NextRequest) {
  const p = request.nextUrl.pathname
  if (p === '/admin' || p === '/admin-dm2026') {
    return NextResponse.redirect(new URL('/ADMIN', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin', '/admin-dm2026'],
}
