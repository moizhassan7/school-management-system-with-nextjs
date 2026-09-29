import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';

export async function GET(request: Request) {
    try {
        const { session, error } = await requirePermission('CONFIGURATION', 'VIEW');
        if (error || !session) return error;

        const view = new URL(request.url).searchParams.get('view');
        const where =
          session.user.role === 'SUPER_ADMIN'
            ? {}
            : { campus: { schoolId: session.user.schoolId || '__none__' } };

        if (view === 'options') {
            const classGroups = await prisma.classGroup.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    classes: {
                        select: {
                            id: true,
                            name: true,
                            sections: {
                                select: { id: true, name: true },
                                orderBy: { name: 'asc' },
                            },
                        },
                        orderBy: { name: 'asc' },
                    },
                },
                orderBy: { name: 'asc' },
            });
            return NextResponse.json(classGroups, {
                headers: { 'Cache-Control': 'private, max-age=60' },
            });
        }

        const classGroups = await prisma.classGroup.findMany({
            where,
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
