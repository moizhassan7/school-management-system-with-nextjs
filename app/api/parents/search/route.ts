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
          // FIX: Added Search by Name
          { user: { name: { contains: query, mode: 'insensitive' } } },
          // FIX: Added mode: 'insensitive' for other fields
          { cnic: { contains: query, mode: 'insensitive' } },
          { user: { email: { contains: query, mode: 'insensitive' } } },
          { user: { phone: { contains: query, mode: 'insensitive' } } },
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
    console.error("Search Error:", error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}