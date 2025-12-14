import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login', // Redirect here if not logged in
  },
  callbacks: {
    // 1. Check if user is allowed to visit the page
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role as string | undefined;

      const { pathname } = nextUrl;
      const isLogin = pathname.startsWith('/login');

      // Enforce authentication for all non-login pages
      if (!isLoggedIn && !isLogin) return false;

      // Redirect logged-in users away from login
      if (isLogin && isLoggedIn) {
        return Response.redirect(new URL('/', nextUrl));
      }

      if (!isLoggedIn) return true; // allow login page

      // RBAC: restrict sections by role
      if (pathname.startsWith('/finance') && !['ACCOUNTANT', 'SUPER_ADMIN'].includes(role || '')) {
        return Response.redirect(new URL('/', nextUrl));
      }

      if (
        (pathname.startsWith('/users') ||
         pathname.startsWith('/schools') ||
         pathname.startsWith('/class-groups') ||
         pathname.startsWith('/subject-groups') ||
         pathname.startsWith('/classes')) &&
        !['ADMIN', 'SUPER_ADMIN'].includes(role || '')
      ) {
        return Response.redirect(new URL('/', nextUrl));
      }

      if (
        (pathname.startsWith('/students') || pathname.startsWith('/academics')) &&
        !['TEACHER', 'ADMIN', 'SUPER_ADMIN'].includes(role || '')
      ) {
        return Response.redirect(new URL('/', nextUrl));
      }

      if (
        pathname.startsWith('/exams') &&
        !['TEACHER', 'ADMIN', 'SUPER_ADMIN'].includes(role || '')
      ) {
        return Response.redirect(new URL('/', nextUrl));
      }

      if (pathname.startsWith('/portal/parent') && role !== 'PARENT') {
        return Response.redirect(new URL('/', nextUrl));
      }

      return true;
    },
    // 2. Add Role to the Token
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.schoolId = user.schoolId;
      }
      return token;
    },
    // 3. Add Role to the Session (so the client sees it)
    session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.schoolId = token.schoolId as string;
      }
      return session;
    }
  },
  providers: [], // Configured in auth.ts
} satisfies NextAuthConfig;
