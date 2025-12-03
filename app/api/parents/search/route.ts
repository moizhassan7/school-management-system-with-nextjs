import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 3) {
    return NextResponse.json([]);
  }

  try {
    const parents = await prisma.parentRecord.findMany({
      where: {
        OR: [
          { cnic: { contains: query } },
          { user: { email: { contains: query } } },
          { user: { phone: { contains: query } } },
        ],
      },
      include: {
        user: {
          select: { name: true, email: true, phone: true }
        }
      },
      take: 5,
    });

    return NextResponse.json(parents);
  } catch (error) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}