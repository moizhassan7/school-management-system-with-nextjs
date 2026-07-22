import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
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
  }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
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

        const passwordHash = crypto
          .createHash('sha256')
          .update(password)
          .digest('hex');

        if (passwordHash !== user.passwordHash) return null;

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
