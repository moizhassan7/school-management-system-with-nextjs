import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET(request: Request) {
  try {
    const session = await auth();
    const role = session?.user?.role;
    const schoolId = session?.user?.schoolId;
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['ACCOUNTANT', 'SUPER_ADMIN'].includes(String(role))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: "Query required" }, { status: 400 });
    }

    // 1. Search for the student (by Admission No OR Name)
    // We use findFirst for simplicity based on your current UI, 
    // but in a real app, you might want to return a list if names match multiple people.
    const studentRecord = await prisma.studentRecord.findFirst({
      where: {
        OR: [
          { admissionNumber: { equals: query, mode: 'insensitive' } }, // Exact match for ID
          { user: { name: { contains: query, mode: 'insensitive' } } } // Partial match for Name
        ],
        schoolId: role === 'SUPER_ADMIN' ? undefined : schoolId
      },
      include: {
        user: true,
        myClass: true,
        section: true,
      }
    });

    if (!studentRecord) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // 2. Fetch Pending Invoices for this student
    // We query the Invoice table directly using the student's User ID
    const invoices = await prisma.invoice.findMany({
      where: {
        studentId: studentRecord.userId,
        status: { not: 'PAID' } // Only show unpaid/partial invoices
      },
      orderBy: {
        dueDate: 'asc'
      }
    });

    // 3. Format the response for the Frontend
    const responseData = {
      id: studentRecord.userId, // User ID for linking
      name: studentRecord.user.name,
      admissionNumber: studentRecord.admissionNumber,
      className: `${studentRecord.myClass?.name || 'No Class'} ${studentRecord.section ? `(${studentRecord.section.name})` : ''}`,
      invoices: invoices
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("Search Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
