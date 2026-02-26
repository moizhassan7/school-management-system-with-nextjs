import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) return NextResponse.json({ error: "Query required" }, { status: 400 });

    // 1. Search Logic (Same as before)
    const invoice = await prisma.invoice.findUnique({
      where: { invoiceNo: query },
      include: {
        student: { include: { studentRecord: { include: { myClass: true, section: true } } } }
      }
    });

    let studentRecord = null;

    if (invoice) {
      studentRecord = await prisma.studentRecord.findUnique({
        where: { userId: invoice.studentId },
        include: {
          user: true,
          myClass: true,
          section: true,
          parents: {
            include: {
              parentRecord: {
                include: {
                  user: true,
                },
              },
            },
          },
        }
      });
    } else {
      studentRecord = await prisma.studentRecord.findFirst({
        where: {
          OR: [
            { admissionNumber: { equals: query, mode: 'insensitive' } },
            { user: { name: { contains: query, mode: 'insensitive' } } }
          ]
        },
        include: {
          user: true,
          myClass: true,
          section: true,
          parents: {
            include: {
              parentRecord: {
                include: {
                  user: true,
                },
              },
            },
          },
        }
      });
    }

    if (!studentRecord) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // 2. Fetch Invoices WITH Payment History
    const invoices = await prisma.invoice.findMany({
      where: {
        studentId: studentRecord.userId,
        status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] }
      },
      include: {
        payments: {  // <--- NEW: Include payment history
          orderBy: { date: 'desc' }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    return NextResponse.json({
      id: studentRecord.userId,
      name: studentRecord.user.name,
      gender: studentRecord.user.gender,
      fatherName:
        studentRecord.parents?.find((parent: any) => parent.relationship === 'FATHER')?.parentRecord?.user?.name ||
        studentRecord.parents?.[0]?.parentRecord?.user?.name ||
        '',
      admissionNumber: studentRecord.admissionNumber,
      className: `${studentRecord.myClass?.name || 'No Class'} ${studentRecord.section ? `(${studentRecord.section.name})` : ''}`,
      invoices: invoices,
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}