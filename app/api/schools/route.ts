import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schoolSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    initials: z.string().min(1, 'Initials are required'),
    address: z.string().min(1, 'Address is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(1, 'Phone number is required'),
    logoPath: z.string().optional(),
});

export async function GET(request: Request) {
    try {
        const schools = await prisma.school.findMany({
            include: {
                campuses: {
                    select: {
                        id: true,
                        name: true,
                        classGroups: {
                            select: {
                                id: true,
                                name: true,
                            },
                            orderBy: {
                                name: 'asc',
                            },
                        },
                    },
                    orderBy: {
                        name: 'asc',
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(schools, { status: 200 });
    } catch (error) {
        console.error('Error fetching schools:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const validatedData = schoolSchema.parse(body);

        const school = await prisma.school.create({
            data: validatedData,
        });

        return NextResponse.json(school, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ errors: error.issues }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
