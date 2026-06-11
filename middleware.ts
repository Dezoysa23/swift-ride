import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/api/auth/login', '/api/auth/register']
const ROLE_HOME: Record<string, string> = {
  admin: '/admin/dashboard',
  driver: '/driver',
  passenger: '/passenger',
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('swift_token')?.value

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (!token) {
    if (isPublic) return NextResponse.next()
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  let payload
  try {
    payload = await verifyToken(token)
  } catch {
    const response = pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      : NextResponse.redirect(new URL('/auth/login', request.url))
    response.cookies.delete('swift_token')
    return response
  }

  // Redirect away from auth pages when already logged in
  if (isPublic) {
    return NextResponse.redirect(new URL(ROLE_HOME[payload.role] ?? '/', request.url))
  }

  // Enforce role boundaries
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (payload.role !== 'admin') {
      return pathname.startsWith('/api/')
        ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL(ROLE_HOME[payload.role], request.url))
    }
  }

  if (pathname.startsWith('/driver') || pathname.startsWith('/api/driver')) {
    if (payload.role !== 'driver') {
      return pathname.startsWith('/api/')
        ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL(ROLE_HOME[payload.role], request.url))
    }
  }

  if (pathname.startsWith('/passenger') || pathname.startsWith('/api/passenger')) {
    if (payload.role !== 'passenger') {
      return pathname.startsWith('/api/')
        ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        : NextResponse.redirect(new URL(ROLE_HOME[payload.role], request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|images|icons).*)',
  ],
}
