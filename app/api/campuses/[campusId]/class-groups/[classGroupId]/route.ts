import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/authz';
import { forbidOrMissing, schoolIdForCampus } from '@/lib/tenant';

const classGroupSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
});

// GET a specific class group
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ campusId: string; classGroupId: string }> }
) {
    try {
        const { session, error } = await requirePermission('CONFIGURATION', 'VIEW');
        if (error || !session) return error;
        const { campusId, classGroupId } = await params;
        const denied = forbidOrMissing(session, await schoolIdForCampus(campusId));
        if (denied) return denied;

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
    { params }: { params: Promise<{ campusId: string; classGroupId: string }> }
) {
    try {
        const { session, error } = await requirePermission('CONFIGURATION', 'EDIT');
        if (error || !session) return error;
        const { campusId, classGroupId } = await params;
        const denied = forbidOrMissing(session, await schoolIdForCampus(campusId));
        if (denied) return denied;
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
    { params }: { params: Promise<{ campusId: string; classGroupId: string }> }
) {
    try {
        const { session, error } = await requirePermission('CONFIGURATION', 'DELETE');
        if (error || !session) return error;
        const { campusId, classGroupId } = await params;
        const denied = forbidOrMissing(session, await schoolIdForCampus(campusId));
        if (denied) return denied;

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
