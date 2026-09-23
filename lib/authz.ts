import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { can, type ActionKey, type ModuleKey } from '@/lib/permissions';

type SessionUser = {
  id?: string;
  role?: string;
  schoolId?: string;
  permissions?: string[];
  campusIds?: string[];
};

export type AppSession = {
  user: SessionUser;
};

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { session: session as AppSession, error: null as null };
}

export async function requirePermission(
  module: ModuleKey | string,
  action: ActionKey | string = 'VIEW'
) {
  const session = await auth();
  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  if (!can(session.user, module, action)) {
    return {
      session: session as AppSession,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  return { session: session as AppSession, error: null as null };
}

/** SUPER_ADMIN may cross schools. Everyone else must match the resource school. */
export function assertSameSchool(
  session: AppSession | null | undefined,
  resourceSchoolId: string | null | undefined
) {
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role === 'SUPER_ADMIN') return null;
  if (!session.user.schoolId || !resourceSchoolId || session.user.schoolId !== resourceSchoolId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

export function sessionSchoolId(session: AppSession): string | undefined {
  return session.user.schoolId || undefined;
}

/** Filter clause that scopes queries to the caller's school (no-op for SUPER_ADMIN). */
export function schoolScope(session: AppSession): { schoolId?: string } {
  if (session.user.role === 'SUPER_ADMIN') return {};
  return { schoolId: session.user.schoolId || '__none__' };
}

const SECRET_KEYS = new Set(['passwordHash', 'password']);

export function stripSecrets<T>(value: T): T {
  if (value == null || typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) {
    return value.map((item) => stripSecrets(item)) as T;
  }
  const maybeDecimal = value as { toNumber?: () => number };
  if (typeof maybeDecimal.toNumber === 'function') return value;

  const input = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(input)) {
    if (SECRET_KEYS.has(key)) continue;
    out[key] = stripSecrets(child);
  }
  return out as T;
}
