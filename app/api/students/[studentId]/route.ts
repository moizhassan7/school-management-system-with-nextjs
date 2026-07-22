import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

const VIEW_ROLES = ['ADMIN', 'SUPER_ADMIN', 'TEACHER', 'ACCOUNTANT', 'STAFF'];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = await auth();
    const role = String(session?.user?.role || '');
    const schoolId = session?.user?.schoolId;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!VIEW_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { studentId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        school: true,
        studentRecord: {
          include: {
            academicYearRecords: {
              include: { academicYear: true, myClass: true, section: true },
              orderBy: { createdAt: 'desc' },
            },
            myClass: true,
            section: true,
            feeStructure: {
              include: {
                items: {
                  include: { feeHead: true },
                  orderBy: { createdAt: 'asc' },
                },
              },
            },
            parents: {
              include: {
                parentRecord: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt || !user.studentRecord) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (role !== 'SUPER_ADMIN' && schoolId && user.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('GET Student Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student' },
      { status: 500 }
    );
  }
}
