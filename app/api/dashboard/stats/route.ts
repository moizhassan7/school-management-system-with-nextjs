import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role, schoolId, id: userId } = session.user;

    // Different stats based on role
    switch (role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return getAdminStats(schoolId!);
      
      case 'ACCOUNTANT':
        return getAccountantStats(schoolId!);
      
      case 'TEACHER':
        return getTeacherStats(userId!, schoolId!);
      
      case 'STUDENT':
        return getStudentStats(userId!, schoolId!);
      
      case 'PARENT':
        return getParentStats(userId!, schoolId!);
      
      case 'STAFF':
        return getStaffStats(userId!, schoolId!);
      
      default:
        return NextResponse.json({ error: 'Invalid role' }, { status: 403 });
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}

// Admin/Super Admin Dashboard Stats
async function getAdminStats(schoolId: string) {
  const [
    totalStudents,
    totalStaff,
    totalTeachers,
    unpaidInvoices,
    recentEnrollments,
    activeAcademicYear,
    todayAttendance
  ] = await Promise.all([
    // Total Students
    prisma.studentRecord.count({
      where: { user: { schoolId, deletedAt: null } }
    }),
    
    // Total Staff
    prisma.staffRecord.count({
      where: { user: { schoolId, deletedAt: null } }
    }),
    
    // Total Teachers
    prisma.staffRecord.count({
      where: { 
        user: { schoolId, deletedAt: null, role: 'TEACHER' }
      }
    }),
    
    // Unpaid Invoices Total
    prisma.invoice.aggregate({
      where: {
        student: { schoolId },
        status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] }
      },
      _sum: {
        totalAmount: true,
        paidAmount: true
      }
    }),
    
    // Recent Enrollments (last 7 days)
    prisma.studentRecord.count({
      where: {
        user: { schoolId, deletedAt: null },
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    }),
    
    // Active Academic Year
    prisma.academicYear.findFirst({
      where: { schoolId, isActive: true }
    }),
    
    // Today's Attendance Summary
    prisma.attendance.groupBy({
      by: ['status'],
      where: {
        schoolId,
        date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      },
      _count: true
    })
  ]);

  const unpaidAmount = (unpaidInvoices._sum.totalAmount || 0) - (unpaidInvoices._sum.paidAmount || 0);
  
  const attendanceStats = todayAttendance.reduce((acc, curr) => {
    acc[curr.status.toLowerCase()] = curr._count;
    return acc;
  }, { present: 0, absent: 0, late: 0, excused: 0 } as Record<string, number>);

  // Get recent activities
  const recentActivities = await prisma.invoice.findMany({
    where: { student: { schoolId } },
    orderBy: { updatedAt: 'desc' },
    take: 5,
    include: {
      student: {
        select: { name: true }
      }
    }
  });

  return NextResponse.json({
    role: 'ADMIN',
    stats: {
      totalStudents,
      totalStaff,
      totalTeachers,
      unpaidAmount: Number(unpaidAmount),
      recentEnrollments,
      attendanceToday: attendanceStats
    },
    academicYear: activeAcademicYear,
    recentActivities: recentActivities.map(inv => ({
      id: inv.id,
      type: 'payment',
      studentName: inv.student.name,
      amount: Number(inv.totalAmount),
      status: inv.status,
      date: inv.updatedAt
    }))
  });
}

// Accountant Dashboard Stats
async function getAccountantStats(schoolId: string) {
  const [
    totalRevenue,
    pendingPayments,
    collectedToday,
    overdueInvoices,
    recentPayments
  ] = await Promise.all([
    // Total Revenue (Paid invoices)
    prisma.invoice.aggregate({
      where: {
        student: { schoolId },
        status: 'PAID'
      },
      _sum: { totalAmount: true }
    }),
    
    // Pending Payments
    prisma.invoice.aggregate({
      where: {
        student: { schoolId },
        status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] }
      },
      _sum: { totalAmount: true, paidAmount: true }
    }),
    
    // Collected Today
    prisma.challan.aggregate({
      where: {
        student: { schoolId },
        status: 'PAID',
        updatedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      },
      _sum: { totalAmount: true }
    }),
    
    // Overdue Invoices Count
    prisma.invoice.count({
      where: {
        student: { schoolId },
        status: 'OVERDUE'
      }
    }),
    
    // Recent Payments
    prisma.challan.findMany({
      where: {
        student: { schoolId },
        status: 'PAID'
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: {
        student: { select: { name: true } }
      }
    })
  ]);

  const pendingAmount = (pendingPayments._sum.totalAmount || 0) - (pendingPayments._sum.paidAmount || 0);

  return NextResponse.json({
    role: 'ACCOUNTANT',
    stats: {
      totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
      pendingPayments: Number(pendingAmount),
      collectedToday: Number(collectedToday._sum.totalAmount || 0),
      overdueInvoices
    },
    recentPayments: recentPayments.map(challan => ({
      id: challan.id,
      studentName: challan.student.name,
      amount: Number(challan.totalAmount),
      date: challan.updatedAt,
      method: challan.paymentMethod
    }))
  });
}

// Teacher Dashboard Stats
async function getTeacherStats(userId: string, schoolId: string) {
  // Get teacher's staff record
  const staffRecord = await prisma.staffRecord.findUnique({
    where: { userId },
    include: {
      assignedSections: {
        include: {
          _count: {
            select: { enrollments: true }
          }
        }
      }
    }
  });

  if (!staffRecord) {
    return NextResponse.json({ 
      role: 'TEACHER',
      stats: {
        mySections: 0,
        totalStudents: 0,
        todayClasses: 0
      },
      sections: []
    });
  }

  const totalStudents = staffRecord.assignedSections.reduce(
    (sum, section) => sum + section._count.enrollments, 
    0
  );

  // Get today's attendance for teacher's sections
  const todayAttendance = await prisma.attendance.groupBy({
    by: ['status'],
    where: {
      schoolId,
      sectionId: { in: staffRecord.assignedSections.map(s => s.id) },
      date: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
        lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    },
    _count: true
  });

  const attendanceStats = todayAttendance.reduce((acc, curr) => {
    acc[curr.status.toLowerCase()] = curr._count;
    return acc;
  }, { present: 0, absent: 0, late: 0, excused: 0 } as Record<string, number>);

  return NextResponse.json({
    role: 'TEACHER',
    stats: {
      mySections: staffRecord.assignedSections.length,
      totalStudents,
      todayClasses: staffRecord.assignedSections.length,
      attendanceToday: attendanceStats
    },
    sections: staffRecord.assignedSections.map(section => ({
      id: section.id,
      name: section.name,
      studentsCount: section._count.enrollments
    }))
  });
}

// Student Dashboard Stats
async function getStudentStats(userId: string, schoolId: string) {
  const studentRecord = await prisma.studentRecord.findUnique({
    where: { userId },
    include: {
      myClass: true,
      section: true,
      user: {
        include: {
          examResults: {
            include: {
              exam: true
            },
            orderBy: { createdAt: 'desc' },
            take: 5
          },
          attendance: {
            where: {
              date: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
              }
            }
          },
          invoices: {
            where: {
              status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] }
            }
          }
        }
      }
    }
  });

  if (!studentRecord) {
    return NextResponse.json({ 
      role: 'STUDENT',
      stats: {},
      message: 'Student record not found'
    });
  }

  // Calculate attendance percentage
  const attendanceRecords = studentRecord.user.attendance;
  const presentCount = attendanceRecords.filter(a => a.status === 'PRESENT').length;
  const attendancePercentage = attendanceRecords.length > 0 
    ? (presentCount / attendanceRecords.length) * 100 
    : 0;

  // Calculate pending fees
  const pendingFees = studentRecord.user.invoices.reduce(
    (sum, inv) => sum + (Number(inv.totalAmount) - Number(inv.paidAmount)),
    0
  );

  return NextResponse.json({
    role: 'STUDENT',
    stats: {
      className: studentRecord.myClass?.name || 'N/A',
      sectionName: studentRecord.section?.name || 'N/A',
      rollNumber: studentRecord.rollNumber || 'N/A',
      attendancePercentage: Math.round(attendancePercentage),
      pendingFees: Number(pendingFees),
      totalExams: studentRecord.user.examResults.length
    },
    recentResults: studentRecord.user.examResults.map(result => ({
      id: result.id,
      examName: result.exam.name,
      percentage: Number(result.percentage),
      grade: result.grade,
      date: result.exam.endDate
    }))
  });
}

// Parent Dashboard Stats
async function getParentStats(userId: string, schoolId: string) {
  const parentRecord = await prisma.parentRecord.findUnique({
    where: { userId },
    include: {
      students: {
        include: {
          studentRecord: {
            include: {
              myClass: true,
              section: true,
              user: {
                include: {
                  invoices: {
                    where: {
                      status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] }
                    }
                  },
                  attendance: {
                    where: {
                      date: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                      }
                    }
                  },
                  examResults: {
                    orderBy: { createdAt: 'desc' },
                    take: 3,
                    include: { exam: true }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  if (!parentRecord) {
    return NextResponse.json({ 
      role: 'PARENT',
      stats: {},
      children: []
    });
  }

  // Calculate total dues and children stats
  let totalDues = 0;
  const children = parentRecord.students.map(kinship => {
    const student = kinship.studentRecord;
    const dues = student.user.invoices.reduce(
      (sum, inv) => sum + (Number(inv.totalAmount) - Number(inv.paidAmount)),
      0
    );
    totalDues += dues;

    // Calculate attendance
    const attendanceRecords = student.user.attendance;
    const presentCount = attendanceRecords.filter(a => a.status === 'PRESENT').length;
    const attendancePercentage = attendanceRecords.length > 0 
      ? (presentCount / attendanceRecords.length) * 100 
      : 0;

    return {
      id: student.userId,
      name: student.user.name,
      className: student.myClass?.name || 'N/A',
      sectionName: student.section?.name || 'N/A',
      rollNumber: student.rollNumber || 'N/A',
      admissionNumber: student.admissionNumber,
      pendingFees: Number(dues),
      attendancePercentage: Math.round(attendancePercentage),
      recentResults: student.user.examResults.map(result => ({
        examName: result.exam.name,
        percentage: Number(result.percentage),
        grade: result.grade
      }))
    };
  });

  return NextResponse.json({
    role: 'PARENT',
    stats: {
      totalChildren: children.length,
      totalDues: Number(totalDues)
    },
    children
  });
}

// Staff Dashboard Stats
async function getStaffStats(userId: string, schoolId: string) {
  const staffRecord = await prisma.staffRecord.findUnique({
    where: { userId },
    include: {
      user: true
    }
  });

  if (!staffRecord) {
    return NextResponse.json({ 
      role: 'STAFF',
      stats: {
        workingDays: 0,
        pendingTasks: 0,
        attendance: {
          present: 0,
          absent: 0,
          late: 0,
          leave: 0
        }
      },
      staffInfo: {}
    });
  }

  // Get current month attendance
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
  
  const attendanceRecords = await prisma.attendance.groupBy({
    by: ['status'],
    where: {
      userId,
      schoolId,
      date: {
        gte: startOfMonth,
        lte: endOfMonth
      }
    },
    _count: true
  });

  const attendanceStats = attendanceRecords.reduce((acc, curr) => {
    acc[curr.status.toLowerCase()] = curr._count;
    return acc;
  }, { present: 0, absent: 0, late: 0, excused: 0 } as Record<string, number>);

  // Calculate working days (present + late)
  const workingDays = (attendanceStats.present || 0) + (attendanceStats.late || 0);

  return NextResponse.json({
    role: 'STAFF',
    stats: {
      workingDays,
      pendingTasks: 0, // Can be extended with actual task management
      attendance: {
        present: attendanceStats.present || 0,
        absent: attendanceStats.absent || 0,
        late: attendanceStats.late || 0,
        leave: attendanceStats.excused || 0
      }
    },
    staffInfo: {
      employeeId: staffRecord.employeeId,
      designation: staffRecord.designation,
      department: staffRecord.department,
      employmentType: staffRecord.employmentType,
      joinDate: staffRecord.joiningDate,
      phone: staffRecord.user.phone,
      emergencyContact: staffRecord.emergencyContactName && staffRecord.emergencyContactPhone ? {
        name: staffRecord.emergencyContactName,
        phone: staffRecord.emergencyContactPhone
      } : null
    }
  });
}

