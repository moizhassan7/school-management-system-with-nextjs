import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const classGroups = await prisma.classGroup.findMany({
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
