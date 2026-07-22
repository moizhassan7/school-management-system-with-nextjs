import type { NextAuthConfig } from 'next-auth';
import { moduleForPath, can } from '@/lib/permissions';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;
      const isLogin = pathname.startsWith('/login');

      if (!isLoggedIn && !isLogin) return false;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.schoolId = user.schoolId;
        token.permissions = user.permissions ?? [];
        token.campusIds = user.campusIds ?? [];
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.schoolId = token.schoolId as string;
        session.user.permissions = (token.permissions as string[]) ?? [];
        session.user.campusIds = (token.campusIds as string[]) ?? [];
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;

export function canViewPath(
  user: { role?: string; permissions?: string[] } | undefined,
  pathname: string
) {
  const module = moduleForPath(pathname);
  if (!module) return true;
  return can(user, module, 'VIEW');
}
