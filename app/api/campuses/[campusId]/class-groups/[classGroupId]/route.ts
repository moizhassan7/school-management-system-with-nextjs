import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const classGroupSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
});

// GET a specific class group
export async function GET(
    request: NextRequest,
    { params }: { params: { campusId: string; classGroupId: string } }
) {
    try {
        const { campusId, classGroupId } = params;

        const classGroup = await prisma.classGroup.findFirst({
            where: {
                id: classGroupId,
                campusId,
            },
            include: {
                campus: {
                    include: {
                        school: true,
                    },
                },
            },
        });

        if (!classGroup) {
            return NextResponse.json(
                { error: 'Class group not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(classGroup);
    } catch (error) {
        console.error('Error fetching class group:', error);
        return NextResponse.json(
            { error: 'Failed to fetch class group' },
            { status: 500 }
        );
    }
}

// PUT update a class group
export async function PUT(
    request: NextRequest,
    { params }: { params: { campusId: string; classGroupId: string } }
) {
    try {
        const { campusId, classGroupId } = params;
        const body = await request.json();

        const validatedData = classGroupSchema.parse(body);

        // Verify class group exists and belongs to campus
        const existingClassGroup = await prisma.classGroup.findFirst({
            where: {
                id: classGroupId,
                campusId,
            },
        });

        if (!existingClassGroup) {
            return NextResponse.json(
                { error: 'Class group not found' },
                { status: 404 }
            );
        }

        const classGroup = await prisma.classGroup.update({
            where: { id: classGroupId },
            data: validatedData,
        });

        return NextResponse.json(classGroup);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', issues: error.issues },
                { status: 400 }
            );
        }

        console.error('Error updating class group:', error);
        return NextResponse.json(
            { error: 'Failed to update class group' },
            { status: 500 }
        );
    }
}

// DELETE a class group
export async function DELETE(
    request: NextRequest,
    { params }: { params: { campusId: string; classGroupId: string } }
) {
    try {
        const { campusId, classGroupId } = params;

        // Verify class group exists and belongs to campus
        const existingClassGroup = await prisma.classGroup.findFirst({
            where: {
                id: classGroupId,
                campusId,
            },
        });

        if (!existingClassGroup) {
            return NextResponse.json(
                { error: 'Class group not found' },
                { status: 404 }
            );
        }

        await prisma.classGroup.delete({
            where: { id: classGroupId },
        });

        return NextResponse.json({ message: 'Class group deleted successfully' });
    } catch (error) {
        console.error('Error deleting class group:', error);
        return NextResponse.json(
            { error: 'Failed to delete class group' },
            { status: 500 }
        );
    }
}
