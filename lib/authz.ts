import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { can, type ActionKey, type ModuleKey } from '@/lib/permissions';

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
      session,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  return { session, error: null as null };
}
