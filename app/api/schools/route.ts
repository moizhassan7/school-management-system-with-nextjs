import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { auth } from '@/auth';
import { can, hasCampusAccess } from '@/lib/permissions';
import { requirePermission } from '@/lib/authz';

const schoolSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  initials: z.string().min(1, 'Initials are required'),
  address: z.string().min(1, 'Address is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  logoPath: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (
      !can(session.user, 'CONFIGURATION', 'VIEW') &&
      !can(session.user, 'USERS', 'VIEW') &&
      !can(session.user, 'DASHBOARD', 'VIEW')
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const view = new URL(request.url).searchParams.get('view');
    const schoolWhere =
      session.user.role === 'SUPER_ADMIN' ? {} : { id: session.user.schoolId || '__none__' };

    if (view === 'nav') {
      const schools = await prisma.school.findMany({
        where: schoolWhere,
        select: {
          id: true,
          name: true,
          initials: true,
          campuses: {
            select: {
              id: true,
              name: true,
              classGroups: {
                select: {
                  id: true,
                  name: true,
                  campusId: true,
                  classes: {
                    select: { id: true, name: true },
                    orderBy: { name: 'asc' },
                  },
                },
                orderBy: { name: 'asc' },
              },
            },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      });
      const filtered = schools.map((school) => ({
        ...school,
        campuses: school.campuses.filter(
          (campus) =>
            session.user.role === 'SUPER_ADMIN' ||
            !session.user.campusIds?.length ||
            hasCampusAccess(session.user, campus.id)
        ),
      }));
      return NextResponse.json(filtered);
    }

    const schools = await prisma.school.findMany({
      where: schoolWhere,
      include: {
        campuses: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            email: true,
            isActive: true,
            schoolId: true,
            classGroups: {
              select: {
                id: true,
                name: true,
                description: true,
                isActive: true,
                campusId: true,
                classes: {
                  select: {
                    id: true,
                    name: true,
                    isActive: true,
                    classGroupId: true,
                    sections: {
                      select: {
                        id: true,
                        name: true,
                        isActive: true,
                        classId: true,
                      },
                      orderBy: { name: 'asc' },
                    },
                  },
                  orderBy: { name: 'asc' },
                },
              },
              orderBy: { name: 'asc' },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const filtered = schools.map((school) => ({
      ...school,
      campuses: school.campuses.filter(
        (c) =>
          session.user.role === 'SUPER_ADMIN' ||
          !session.user.campusIds?.length ||
          hasCampusAccess(session.user, c.id)
      ),
    }));

    return NextResponse.json(filtered, { status: 200 });
  } catch (error) {
    console.error('Error fetching schools:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { error } = await requirePermission('CONFIGURATION', 'CREATE');
    if (error) return error;

    const body = await request.json();
    const validatedData = schoolSchema.parse(body);

    const school = await prisma.school.create({
      data: validatedData,
    });

    return NextResponse.json(school, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
