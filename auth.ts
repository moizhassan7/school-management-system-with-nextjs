import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Types extension for TypeScript
declare module 'next-auth' {
  interface User {
    role?: string;
    schoolId?: string;
  }
  interface Session {
    user: {
      role?: string;
      schoolId?: string;
    } & import('next-auth').DefaultSession['user'];
  }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsed.success) {
          const { email, password } = parsed.data;
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user) return null;

          const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

          if (passwordHash === user.passwordHash) {
            // Explicitly return the fields we need
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: String(user.role), // Ensure string conversion
              schoolId: user.schoolId,
            };
          }
        }
        return null;
      },
    }),
  ],
});