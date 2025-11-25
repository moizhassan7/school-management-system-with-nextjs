import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const campusSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    address: z.string().min(1, 'Address is required'),
    phone: z.string().min(1, 'Phone number is required'),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
});

export async function GET(
    request: Request,
    { params }: { params: Promise<{ schoolId: string; campusId: string }> }
) {
    try {
        const { schoolId, campusId } = await params;

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
        const { schoolId, campusId } = await params;

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
                ...validatedData,
                email: validatedData.email || null,
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
        const { schoolId, campusId } = await params;

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
