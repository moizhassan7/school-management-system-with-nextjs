import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardHeader from '@/components/dashboard-header';
import AdminDashboard from '@/components/dashboards/admin-dashboard';
import AccountantDashboard from '@/components/dashboards/accountant-dashboard';
import TeacherDashboard from '@/components/dashboards/teacher-dashboard';
import StudentDashboard from '@/components/dashboards/student-dashboard';
import ParentDashboard from '@/components/dashboards/parent-dashboard';
import StaffDashboard from '@/components/dashboards/staff-dashboard';

// Admin/Super Admin Dashboard Stats
async function getAdminStats(schoolId: string) {
  const [
    totalStudents,
    totalStaff,
    totalTeachers,
    unpaidInvoices,
    recentEnrollments,
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

  const unpaidAmount = Number(unpaidInvoices._sum.totalAmount || 0) - Number(unpaidInvoices._sum.paidAmount || 0);

  const attendanceStats = todayAttendance.reduce((acc, curr) => {
    acc[curr.status.toLowerCase()] = curr._count;
    return acc;
  }, { present: 0, absent: 0, late: 0, excused: 0 } as Record<string, number>);

  return {
    role: 'ADMIN',
    stats: {
      totalStudents,
      totalStaff,
      totalTeachers,
      unpaidAmount: Number(unpaidAmount),
      recentEnrollments,
      attendanceToday: attendanceStats
    }
  };
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

  const pendingAmount = Number(pendingPayments._sum.totalAmount || 0) - Number(pendingPayments._sum.paidAmount || 0);

  return {
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
      method: 'CASH' // Default method since paymentMethod is in ChallanPayment
    }))
  };
}

// Teacher Dashboard Stats
async function getTeacherStats(userId: string, schoolId: string) {
  // Get teacher's staff record and assignments
  const staffRecord = await prisma.staffRecord.findUnique({
    where: { userId },
    include: {
      assignments: {
        include: {
          section: {
            include: {
              _count: {
                select: { students: true }
              }
            }
          }
        }
      }
    }
  });

  if (!staffRecord) {
    return {
      role: 'TEACHER',
      stats: {
        mySections: 0,
        totalStudents: 0,
        todayClasses: 0
      },
      sections: []
    };
  }

  const totalStudents = staffRecord.assignments.reduce(
    (sum: number, assignment) => sum + (assignment.section?._count.students || 0),
    0
  );

  // Get today's attendance for teacher's sections
  const sectionIds = staffRecord.assignments.map(a => a.sectionId).filter((id): id is string => id !== null);
  const todayAttendance = await prisma.attendance.groupBy({
    by: ['status'],
    where: {
      schoolId,
      sectionId: { in: sectionIds },
      date: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
        lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    },
    _count: true
  });

  const attendanceStats = todayAttendance.reduce((acc, curr) => {
    acc[curr.status.toLowerCase()] = Number(curr._count);
    return acc;
  }, { present: 0, absent: 0, late: 0, excused: 0 } as Record<string, number>);

  return {
    role: 'TEACHER',
    stats: {
      mySections: staffRecord.assignments.length,
      totalStudents,
      todayClasses: staffRecord.assignments.length,
      attendanceToday: attendanceStats
    },
    sections: staffRecord.assignments.map(assignment => ({
      id: assignment.section?.id || '',
      name: assignment.section?.name || '',
      studentsCount: assignment.section?._count.students || 0
    }))
  };
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
    return {
      role: 'STUDENT',
      stats: {},
      message: 'Student record not found'
    };
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

  return {
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
      percentage: 0, // Default since percentage is not in schema
      grade: 'N/A', // Default since grade is not in schema
      date: result.exam.endDate
    }))
  };
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
    return {
      role: 'PARENT',
      stats: {},
      children: []
    };
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
        percentage: 0, // Default since percentage is not in schema
        grade: 'N/A' // Default since grade is not in schema
      }))
    };
  });

  return {
    role: 'PARENT',
    stats: {
      totalChildren: children.length,
      totalDues: Number(totalDues)
    },
    children
  };
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
    return {
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
    };
  }

  // Get current month attendance
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

  const attendanceRecords = await prisma.attendance.groupBy({
    by: ['status'],
    where: {
      studentId: userId,
      schoolId,
      date: {
        gte: startOfMonth,
        lte: endOfMonth
      }
    },
    _count: { status: true }
  });

  const attendanceStats = attendanceRecords.reduce((acc, curr) => {
    acc[curr.status.toLowerCase()] = curr._count.status;
    return acc;
  }, { present: 0, absent: 0, late: 0, excused: 0 } as Record<string, number>);

  // Calculate working days (present + late)
  const workingDays = (attendanceStats.present || 0) + (attendanceStats.late || 0);

  return {
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
      designation: staffRecord.designation || 'N/A',
      department: staffRecord.department || 'N/A',
      employmentType: staffRecord.employmentType || 'N/A',
      joinDate: staffRecord.joiningDate || new Date(),
      phone: staffRecord.user.phone || 'N/A',
      emergencyContact: null // Default since emergencyContactName/Phone not in schema
    }
  };
}

export default async function Dashboard() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Fetch dashboard data directly from database
  let dashboardData;

  try {
    const { role, schoolId, id: userId } = session.user;

    // Different stats based on role
    switch (role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        dashboardData = await getAdminStats(schoolId!);
        break;

      case 'ACCOUNTANT':
        dashboardData = await getAccountantStats(schoolId!);
        break;

      case 'TEACHER':
        dashboardData = await getTeacherStats(userId!, schoolId!);
        break;

      case 'STUDENT':
        dashboardData = await getStudentStats(userId!, schoolId!);
        break;

      case 'PARENT':
        dashboardData = await getParentStats(userId!, schoolId!);
        break;

      case 'STAFF':
        dashboardData = await getStaffStats(userId!, schoolId!);
        break;

      default:
        dashboardData = {
          role,
          stats: {},
          message: 'Invalid role'
        };
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    dashboardData = {
      role: session.user.role,
      stats: {},
      message: 'Failed to load dashboard data'
    };
  }

  const role = session.user.role;
  const userName = session.user.name || 'User';
  const userEmail = session.user.email || '';

  return (
    <div className="flex flex-col h-full bg-[#f6f7f8] dark:bg-[#101922]">
      <DashboardHeader user={{ name: userName, email: userEmail, role }} />

      {/* Render role-specific dashboard */}
      {(role === 'SUPER_ADMIN' || role === 'ADMIN') && <AdminDashboard data={dashboardData} />}
      {role === 'ACCOUNTANT' && <AccountantDashboard data={dashboardData} />}
      {role === 'TEACHER' && <TeacherDashboard data={dashboardData} />}
      {role === 'STUDENT' && <StudentDashboard data={dashboardData} />}
      {role === 'PARENT' && <ParentDashboard data={dashboardData} />}
      {role === 'STAFF' && <StaffDashboard data={dashboardData} />}

      {/* Fallback for unknown roles */}
      {!['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'TEACHER', 'STUDENT', 'PARENT', 'STAFF'].includes(role || '') && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
            <p className="text-slate-500">Your role does not have access to this dashboard.</p>
          </div>
        </div>
      )}
    </div>
  );
}