import { auth } from '@/auth';

export const runtime = 'nodejs';

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // For API routes, just run auth but don't apply page logic
  if (pathname.startsWith('/api/')) {
    // Auth runs here to populate req.auth, but we don't redirect
    return;
  }

  // For pages, use the authorized logic from auth.config.ts
  const isLoggedIn = !!req.auth?.user;
  const role = req.auth?.user?.role as string | undefined;

  const isLogin = pathname.startsWith('/login');

  // If logged in and on login page, redirect to dashboard
  if (isLoggedIn && isLogin) {
    return Response.redirect(new URL('/', req.url));
  }

  // Enforce authentication for all non-login pages
  if (!isLoggedIn && !isLogin) {
    return Response.redirect(new URL('/login', req.url));
  }



  if (!isLoggedIn) return; // allow login page

  // RBAC: restrict sections by role
  if (pathname.startsWith('/finance') && !['ACCOUNTANT', 'SUPER_ADMIN'].includes(role || '')) {
    return Response.redirect(new URL('/', req.url));
  }

  if (
    (pathname.startsWith('/users') ||
     pathname.startsWith('/schools') ||
     pathname.startsWith('/class-groups') ||
     pathname.startsWith('/subject-groups') ||
     pathname.startsWith('/classes')) &&
    !['ADMIN', 'SUPER_ADMIN'].includes(role || '')
  ) {
    return Response.redirect(new URL('/', req.url));
  }

  if (
    (pathname.startsWith('/students') || pathname.startsWith('/academics')) &&
    !['TEACHER', 'ADMIN', 'SUPER_ADMIN'].includes(role || '')
  ) {
    return Response.redirect(new URL('/', req.url));
  }

  if (
    pathname.startsWith('/exams') &&
    !['TEACHER', 'ADMIN', 'SUPER_ADMIN'].includes(role || '')
  ) {
    return Response.redirect(new URL('/', req.url));
  }

  if (pathname.startsWith('/portal/parent') && role !== 'PARENT') {
    return Response.redirect(new URL('/', req.url));
  }
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (svg, png, jpg, jpeg, gif, webp)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.webp).*)',
  ],
};