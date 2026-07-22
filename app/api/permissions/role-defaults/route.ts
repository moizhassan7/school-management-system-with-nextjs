import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { permissionKey, ROLE_DEFAULT_MODULES } from '@/lib/permissions';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') as Role | null;

    if (!role || role === Role.SUPER_ADMIN) {
      return NextResponse.json({ permissions: [] });
    }

    const rolePerms = await prisma.rolePermission.findMany({
      where: { role },
      include: { permission: true },
    });

    if (rolePerms.length > 0) {
      return NextResponse.json({
        permissions: rolePerms.map((rp) =>
          permissionKey(rp.permission.module, rp.permission.action)
        ),
      });
    }

    // Fallback to in-code defaults if seed not run yet
    const defaults = ROLE_DEFAULT_MODULES[role as Exclude<Role, 'SUPER_ADMIN'>] || {};
    const keys: string[] = [];
    for (const [module, actions] of Object.entries(defaults)) {
      for (const action of actions || []) {
        keys.push(permissionKey(module, action));
      }
    }
    return NextResponse.json({ permissions: keys });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch role defaults' }, { status: 500 });
  }
}
