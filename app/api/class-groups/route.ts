import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

export async function GET() {
    try {
        const { session, error } = await requirePermission('CONFIGURATION', 'VIEW');
        if (error || !session) return error;

        const classGroups = await prisma.classGroup.findMany({
            where:
              session.user.role === 'SUPER_ADMIN'
                ? {}
                : { campus: { schoolId: session.user.schoolId || '__none__' } },
            include: {
                classes: {
                    include: {
                        sections: {
                            orderBy: { name: 'asc' }
                        }
                    },
                    orderBy: { name: 'asc' }
                },
                subjectGroups: {
                    orderBy: { name: 'asc' }
                },
                campus: {
                    include: {
                        school: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return NextResponse.json(classGroups);
    } catch (error) {
        console.error('Error fetching class groups:', error);
        return NextResponse.json({ error: 'Failed to fetch class groups' }, { status: 500 });
    }
}
