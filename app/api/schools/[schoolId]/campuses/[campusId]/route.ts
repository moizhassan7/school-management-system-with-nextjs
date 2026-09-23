import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requirePermission, assertSameSchool } from '@/lib/authz';

const campusSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    address: z.string().min(1, 'Address is required'),
    phone: z.string().min(1, 'Phone number is required'),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    isActive: z.boolean().optional(),
});

export async function GET(
    request: Request,
    { params }: { params: Promise<{ schoolId: string; campusId: string }> }
) {
    try {
        const { session, error } = await requirePermission('CONFIGURATION', 'VIEW');
        if (error || !session) return error;
        const { schoolId, campusId } = await params;
        const denied = assertSameSchool(session, schoolId);
        if (denied) return denied;

        const campus = await prisma.campus.findFirst({
            where: {
                id: campusId,
                schoolId,
            },
        });

        if (!campus) {
            return NextResponse.json(
                { error: 'Campus not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(campus, { status: 200 });
    } catch (error) {
        console.error('Error fetching campus:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ schoolId: string; campusId: string }> }
) {
    try {
        const { session, error } = await requirePermission('CONFIGURATION', 'EDIT');
        if (error || !session) return error;
        const { schoolId, campusId } = await params;
        const denied = assertSameSchool(session, schoolId);
        if (denied) return denied;

        // Verify campus exists and belongs to school
        const existingCampus = await prisma.campus.findFirst({
            where: {
                id: campusId,
                schoolId,
            },
        });

        if (!existingCampus) {
            return NextResponse.json(
                { error: 'Campus not found' },
                { status: 404 }
            );
        }

        const body = await request.json();
        const validatedData = campusSchema.parse(body);

        const campus = await prisma.campus.update({
            where: { id: campusId },
            data: {
                name: validatedData.name,
                address: validatedData.address,
                phone: validatedData.phone,
                email: validatedData.email || null,
                ...(validatedData.isActive !== undefined
                  ? { isActive: validatedData.isActive }
                  : {}),
            },
        });

        return NextResponse.json(campus, { status: 200 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ errors: error.issues }, { status: 400 });
        }
        console.error('Error updating campus:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ schoolId: string; campusId: string }> }
) {
    try {
        const { session, error } = await requirePermission('CONFIGURATION', 'DELETE');
        if (error || !session) return error;
        const { schoolId, campusId } = await params;
        const denied = assertSameSchool(session, schoolId);
        if (denied) return denied;

        // Verify campus exists and belongs to school
        const existingCampus = await prisma.campus.findFirst({
            where: {
                id: campusId,
                schoolId,
            },
        });

        if (!existingCampus) {
            return NextResponse.json(
                { error: 'Campus not found' },
                { status: 404 }
            );
        }

        await prisma.campus.delete({
            where: { id: campusId },
        });

        return NextResponse.json(
            { message: 'Campus deleted successfully' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Error deleting campus:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
