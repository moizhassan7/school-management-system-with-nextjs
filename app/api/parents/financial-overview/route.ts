import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { requirePermission, schoolScope } from '@/lib/authz';

export const dynamic = 'force-dynamic';

type InvoiceLike = { totalAmount: unknown; paidAmount: unknown };

function dueSum(items: InvoiceLike[]) {
  return items.reduce(
    (sum, item) => sum + (Number(item.totalAmount) - Number(item.paidAmount)),
    0
  );
}

const childrenInclude = {
  students: {
    include: {
      studentRecord: {
        include: {
          myClass: true,
          user: {
            include: {
              invoices: {
                where: { status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] as const } },
              },
              challans: {
                where: { status: 'PENDING' as const },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ParentRecordInclude;

function processParent(parent: {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  parentRecord: {
    cnic: string | null;
    students: Array<{
      studentRecord: {
        rollNumber: string | null;
        myClass: { name: string } | null;
        user: {
          id: string;
          name: string | null;
          invoices: InvoiceLike[];
          challans: InvoiceLike[];
        };
      };
    }>;
  } | null;
}) {
  let totalFamilyDue = 0;
  const childrenData =
    parent.parentRecord?.students.map((kinship) => {
      const studentUser = kinship.studentRecord.user;
      const studentClass = kinship.studentRecord.myClass?.name || 'N/A';
      const invoiceDue = dueSum(studentUser.invoices);
      const challanDue = dueSum(studentUser.challans);
      const childTotal = invoiceDue + challanDue;
      totalFamilyDue += childTotal;

      return {
        studentId: studentUser.id,
        name: studentUser.name,
        className: studentClass,
        rollNumber: kinship.studentRecord.rollNumber || '-',
        invoiceDue,
        challanDue,
        totalDue: childTotal,
      };
    }) || [];

  return {
    id: parent.id,
    name: parent.name,
    email: parent.email,
    phone: parent.phone,
    cnic: parent.parentRecord?.cnic,
    childrenCount: childrenData.length,
    totalFamilyDue,
    children: childrenData,
  };
}

export async function GET(request: Request) {
  try {
    const { session, error } = await requirePermission('FEES', 'VIEW');
    if (error || !session) return error;

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get('parentId')?.trim() || '';
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(100, Math.max(10, Number(searchParams.get('pageSize') || 25)));
    const q = searchParams.get('q')?.trim() || '';

    const where: Prisma.UserWhereInput = {
      role: 'PARENT',
      ...schoolScope(session),
      parentRecord: { isNot: null },
      ...(parentId ? { id: parentId } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q, mode: 'insensitive' } },
              { parentRecord: { is: { cnic: { contains: q, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    // Single-parent fetch for detail / collect pages
    if (parentId) {
      const parent = await prisma.user.findFirst({
        where,
        include: {
          parentRecord: { include: childrenInclude },
        },
      });

      if (!parent) {
        return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
      }

      return NextResponse.json(processParent(parent));
    }

    const [total, parents, outstandingParents] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        include: {
          parentRecord: { include: childrenInclude },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      // Lean query for KPI total across all matching parents
      prisma.user.findMany({
        where,
        select: {
          parentRecord: {
            select: {
              students: {
                select: {
                  studentRecord: {
                    select: {
                      user: {
                        select: {
                          invoices: {
                            where: { status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } },
                            select: { totalAmount: true, paidAmount: true },
                          },
                          challans: {
                            where: { status: 'PENDING' },
                            select: { totalAmount: true, paidAmount: true },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const processedParents = parents.map(processParent);

    const totalOutstanding = outstandingParents.reduce((sum, parent) => {
      const kids = parent.parentRecord?.students || [];
      const familyDue = kids.reduce((childSum, kinship) => {
        const user = kinship.studentRecord.user;
        return childSum + dueSum(user.invoices) + dueSum(user.challans);
      }, 0);
      return sum + familyDue;
    }, 0);

    return NextResponse.json({
      data: processedParents,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      totalOutstanding,
    });
  } catch (error) {
    console.error('Error fetching parent overview:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
