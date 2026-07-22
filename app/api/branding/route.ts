import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

const FALLBACK = {
  id: null as string | null,
  name: 'School Management',
  initials: 'SMS',
  logoPath: '/logo/logo.png',
  address: null as string | null,
  email: null as string | null,
  phone: null as string | null,
};

/**
 * Public branding endpoint — used on login + app shell.
 * Prefer the session user's school; otherwise first active school.
 */
export async function GET() {
  try {
    const session = await auth();
    const schoolId = session?.user?.schoolId;

    let school = schoolId
      ? await prisma.school.findFirst({
          where: { id: schoolId, isActive: true },
          select: {
            id: true,
            name: true,
            initials: true,
            logoPath: true,
            address: true,
            email: true,
            phone: true,
          },
        })
      : null;

    if (!school) {
      school = await prisma.school.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          initials: true,
          logoPath: true,
          address: true,
          email: true,
          phone: true,
        },
      });
    }

    if (!school) {
      return NextResponse.json(FALLBACK);
    }

    return NextResponse.json({
      id: school.id,
      name: school.name,
      initials: school.initials,
      logoPath: school.logoPath || FALLBACK.logoPath,
      address: school.address,
      email: school.email,
      phone: school.phone,
    });
  } catch (error) {
    console.error('Branding fetch failed:', error);
    return NextResponse.json(FALLBACK);
  }
}
