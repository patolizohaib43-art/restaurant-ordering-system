import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, ADMIN_SESSION_COOKIE_NAME } from '@/lib/auth';

const PUBLIC_PAGE_PATHS = ['/admin/login'];
const PUBLIC_API_PATHS = [
  '/api/admin/auth/login',
  // Fired by the service worker's `pushsubscriptionchange` event, which
  // has no cookie/session context of its own — see push/unsubscribe/route.ts
  // for why this is still safe to leave unauthenticated.
  '/api/admin/push/unsubscribe',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPage = PUBLIC_PAGE_PATHS.some((p) => pathname === p);
  const isPublicApi = PUBLIC_API_PATHS.some((p) => pathname.startsWith(p));
  if (isPublicPage || isPublicApi) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifyAdminSession(token) : null;

  const isApiRoute = pathname.startsWith('/api/admin');

  if (!session) {
    if (isApiRoute) {
      return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
    }
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
