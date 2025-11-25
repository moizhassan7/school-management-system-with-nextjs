import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ schoolId: string }> }
) {
    try {
        const { schoolId } = await params;

        const school = await prisma.school.findUnique({
            where: { id: schoolId },
        });

        if (!school) {
            return NextResponse.json(
                { error: 'School not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(school, { status: 200 });
    } catch (error) {
        console.error('Error fetching school:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
