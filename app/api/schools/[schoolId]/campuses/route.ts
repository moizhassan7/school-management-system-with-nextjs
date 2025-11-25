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
    { params }: { params: Promise<{ schoolId: string }> }
) {
    try {
        const { schoolId } = await params;

        // Verify school exists
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
        });

        if (!school) {
            return NextResponse.json(
                { error: 'School not found' },
                { status: 404 }
            );
        }

        const campuses = await prisma.campus.findMany({
            where: { schoolId },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(campuses, { status: 200 });
    } catch (error) {
        console.error('Error fetching campuses:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ schoolId: string }> }
) {
    try {
        const { schoolId } = await params;

        // Verify school exists
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
        });

        if (!school) {
            return NextResponse.json(
                { error: 'School not found' },
                { status: 404 }
            );
        }

        const body = await request.json();
        const validatedData = campusSchema.parse(body);

        const campus = await prisma.campus.create({
            data: {
                ...validatedData,
                email: validatedData.email || null,
                schoolId,
            },
        });

        return NextResponse.json(campus, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ errors: error.issues }, { status: 400 });
        }
        console.error('Error creating campus:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
