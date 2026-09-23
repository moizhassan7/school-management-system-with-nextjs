import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

export async function GET() {
  try {
    const { error } = await requirePermission('USERS', 'VIEW');
    if (error) return error;
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
    return NextResponse.json(permissions);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
  }
}
