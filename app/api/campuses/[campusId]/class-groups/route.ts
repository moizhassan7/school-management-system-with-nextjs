import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const classGroupSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
});

// GET all class groups for a campus
export async function GET(
    request: NextRequest,
    { params }: { params: { campusId: string } }
) {
    try {
        const { campusId } = params;

        const classGroups = await prisma.classGroup.findMany({
            where: { campusId },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(classGroups);
    } catch (error) {
        console.error('Error fetching class groups:', error);
        return NextResponse.json(
            { error: 'Failed to fetch class groups' },
            { status: 500 }
        );
    }
}

// POST create a new class group
export async function POST(
    request: NextRequest,
    { params }: { params: { campusId: string } }
) {
    try {
        const { campusId } = params;
        const body = await request.json();

        const validatedData = classGroupSchema.parse(body);

        // Verify campus exists
        const campus = await prisma.campus.findUnique({
            where: { id: campusId },
        });

        if (!campus) {
            return NextResponse.json(
                { error: 'Campus not found' },
                { status: 404 }
            );
        }

        const classGroup = await prisma.classGroup.create({
            data: {
                ...validatedData,
                campusId,
            },
        });

        return NextResponse.json(classGroup, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', issues: error.issues },
                { status: 400 }
            );
        }

        console.error('Error creating class group:', error);
        return NextResponse.json(
            { error: 'Failed to create class group' },
            { status: 500 }
        );
    }
}
