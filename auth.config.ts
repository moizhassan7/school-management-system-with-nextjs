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
