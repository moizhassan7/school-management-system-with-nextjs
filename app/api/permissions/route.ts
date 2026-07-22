import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
    return NextResponse.json(permissions);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
  }
}
