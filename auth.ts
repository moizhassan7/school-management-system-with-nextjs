import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/password';
import { clearLoginAttempts, isLoginRateLimited, recordLoginFailure } from '@/lib/login-attempts';
import { resolveCampusIds, resolveUserPermissions } from '@/lib/permissions';

declare module 'next-auth' {
  interface User {
    role?: string;
    schoolId?: string;
    permissions?: string[];
    campusIds?: string[];
  }
  interface Session {
    user: {
      id?: string;
      role?: string;
      schoolId?: string;
      permissions?: string[];
      campusIds?: string[];
    } & import('next-auth').DefaultSession['user'];
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    role?: string;
    schoolId?: string;
    permissions?: string[];
    campusIds?: string[];
    permissionsLoadedAt?: number;
  }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  trustHost: true,
  useSecureCookies: process.env.NODE_ENV === 'production',
  session: { strategy: 'jwt', maxAge: 60 * 60 * 8 },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.schoolId = user.schoolId;
        token.permissions = user.permissions ?? [];
        token.campusIds = user.campusIds ?? [];
        token.permissionsLoadedAt = Date.now();
      }

      const loadedAt = Number(token.permissionsLoadedAt || 0);
      const stale = Date.now() - loadedAt > 5 * 60 * 1000;
      if ((trigger === 'update' || (token.id && stale)) && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: String(token.id) },
          select: { role: true, schoolId: true, deletedAt: true, suspended: true, locked: true },
        });
        if (!dbUser || dbUser.deletedAt || dbUser.suspended || dbUser.locked) {
          token.permissions = [];
          token.role = undefined;
          return token;
        }
        token.role = String(dbUser.role);
        token.schoolId = dbUser.schoolId;
        const [permissions, campusIds] = await Promise.all([
          resolveUserPermissions(prisma as any, String(token.id), String(dbUser.role)),
          resolveCampusIds(prisma as any, String(token.id)),
        ]);
        token.permissions = permissions;
        token.campusIds = campusIds;
        token.permissionsLoadedAt = Date.now();
      }
      return token;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email or Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = z
          .object({
            email: z.string().min(1),
            password: z.string().min(6),
          })
          .safeParse(credentials);

        if (!parsed.success) return null;

        const { email: login, password } = parsed.data;
        const attemptKey = login.toLowerCase();
        if (await isLoginRateLimited(attemptKey)) return null;

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: login, mode: 'insensitive' } },
              { username: { equals: login, mode: 'insensitive' } },
            ],
          },
        });

        if (!user) return null;
        if (user.deletedAt || user.suspended || user.locked) return null;

        const verified = await verifyPassword(password, user.passwordHash);
        if (!verified.ok) {
          await recordLoginFailure(attemptKey);
          return null;
        }
        await clearLoginAttempts(attemptKey);

        if (verified.needsUpgrade) {
          const upgraded = await hashPassword(password);
          await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: upgraded },
          });
        }

        const [permissions, campusIds] = await Promise.all([
          resolveUserPermissions(prisma as any, user.id, String(user.role)),
          resolveCampusIds(prisma as any, user.id),
        ]);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: String(user.role),
          schoolId: user.schoolId,
          permissions,
          campusIds,
        };
      },
    }),
  ],
});
