import { auth } from '@/auth';
import { canViewPath } from '@/auth.config';

export const runtime = 'nodejs';

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/')) {
    return;
  }

  const isLoggedIn = !!req.auth?.user;
  const isLogin = pathname.startsWith('/login');

  if (isLoggedIn && isLogin) {
    return Response.redirect(new URL('/', req.url));
  }

  if (!isLoggedIn && !isLogin) {
    return Response.redirect(new URL('/login', req.url));
  }

  if (!isLoggedIn) return;

  if (pathname.startsWith('/portal/parent') && req.auth?.user?.role !== 'PARENT') {
    return Response.redirect(new URL('/', req.url));
  }

  if (pathname.startsWith('/portal/student') && req.auth?.user?.role !== 'STUDENT') {
    return Response.redirect(new URL('/', req.url));
  }

  if (!canViewPath(req.auth?.user, pathname)) {
    return Response.redirect(new URL('/', req.url));
  }
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.webp).*)',
  ],
};
