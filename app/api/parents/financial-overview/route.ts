import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch all users with role PARENT
    const parents = await prisma.user.findMany({
      where: {
        role: 'PARENT',
        parentRecord: { isNot: null } // Ensure they have a parent record
      },
      include: {
        parentRecord: {
          include: {
            // Get all children via Kinship
            students: {
              include: {
                studentRecord: {
                  include: {
                    myClass: true, // For class name
                    user: {
                      include: {
                        // Get UNPAID invoices
                        invoices: {
                          where: {
                            status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] }
                          }
                        },
                        // Get PENDING challans
                        challans: {
                          where: {
                            status: 'PENDING'
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Process data to calculate totals
    const processedParents = parents.map(parent => {
      let totalFamilyDue = 0;
      const childrenData = parent.parentRecord?.students.map(kinship => {
        const studentUser = kinship.studentRecord.user;
        const studentClass = kinship.studentRecord.myClass?.name || 'N/A';
        
        // Calculate Invoice Dues
        const invoiceDue = studentUser.invoices.reduce((sum, inv) => {
          return sum + (Number(inv.totalAmount) - Number(inv.paidAmount));
        }, 0);

        // Calculate Challan Dues
        const challanDue = studentUser.challans.reduce((sum, ch) => {
          return sum + (Number(ch.totalAmount) - Number(ch.paidAmount));
        }, 0);

        const childTotal = invoiceDue + challanDue;
        totalFamilyDue += childTotal;

        return {
          studentId: studentUser.id,
          name: studentUser.name,
          className: studentClass,
          rollNumber: kinship.studentRecord.rollNumber || '-',
          invoiceDue,
          challanDue,
          totalDue: childTotal
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
        children: childrenData
      };
    });

    return NextResponse.json(processedParents);
  } catch (error) {
    console.error('Error fetching parent overview:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}