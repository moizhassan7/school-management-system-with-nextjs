'use client';

import { 
    Users, 
    UserCheck, 
    Wallet, 
    UserPlus, 
    TrendingUp,
    CalendarCheck,
    CreditCard,
    Megaphone,
    FileText,
    MessageCircle
} from 'lucide-react';
import Link from 'next/link';

interface AdminDashboardProps {
  data: any;
}

export default function AdminDashboard({ data }: AdminDashboardProps) {
  const { stats = {}, recentActivities = [], academicYear } = data || {};

  // Provide default values for all stats
  const safeStats = {
    totalStudents: stats.totalStudents ?? 0,
    recentEnrollments: stats.recentEnrollments ?? 0,
    totalStaff: stats.totalStaff ?? 0,
    totalTeachers: stats.totalTeachers ?? 0,
    unpaidAmount: stats.unpaidAmount ?? 0,
    attendanceToday: {
      present: stats.attendanceToday?.present ?? 0,
      absent: stats.attendanceToday?.absent ?? 0,
      late: stats.attendanceToday?.late ?? 0,
      excused: stats.attendanceToday?.excused ?? 0,
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <Link href="/students" className="bg-white dark:bg-[#1a2632] p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-primary">
              <Users className="h-6 w-6" />
            </div>
            <span className="text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> +{safeStats.recentEnrollments}
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Students</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{safeStats.totalStudents}</h3>
        </Link>

        {/* Total Staff */}
        <Link href="/staff" className="bg-white dark:bg-[#1a2632] p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
              <UserCheck className="h-6 w-6" />
            </div>
            <span className="text-slate-500 text-xs font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Total</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Staff Members</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{safeStats.totalStaff}<span className="text-slate-400 text-lg font-normal"> ({safeStats.totalTeachers} teachers)</span></h3>
        </Link>

        {/* Unpaid Fees */}
        <Link href="/finance/invoices" className="bg-white dark:bg-[#1a2632] p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600">
              <Wallet className="h-6 w-6" />
            </div>
            <span className="text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded text-xs font-semibold">Pending</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Unpaid Fees</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Rs. {safeStats.unpaidAmount.toLocaleString()}</h3>
        </Link>

        {/* Today's Attendance */}
        <Link href="/attendance" className="bg-white dark:bg-[#1a2632] p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg text-teal-600">
              <CalendarCheck className="h-6 w-6" />
            </div>
            <span className="text-slate-500 text-xs font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Today</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Attendance</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {safeStats.attendanceToday.present}
            <span className="text-slate-400 text-lg font-normal"> present</span>
          </h3>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1a2632] rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Today&apos;s Attendance Overview</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Attendance breakdown for all students</p>
            </div>
            {academicYear && (
              <div className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded">
                {academicYear.name}
              </div>
            )}
          </div>
          
          {/* Attendance Bar Chart */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-slate-600 dark:text-slate-300">Present</span>
                <span className="font-semibold text-green-600">{safeStats.attendanceToday.present}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3">
                <div 
                  className="bg-green-500 h-3 rounded-full transition-all duration-500" 
                  style={{ 
                    width: `${safeStats.totalStudents > 0 ? (safeStats.attendanceToday.present / safeStats.totalStudents * 100) : 0}%` 
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-slate-600 dark:text-slate-300">Absent</span>
                <span className="font-semibold text-red-600">{safeStats.attendanceToday.absent}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3">
                <div 
                  className="bg-red-500 h-3 rounded-full transition-all duration-500" 
                  style={{ 
                    width: `${safeStats.totalStudents > 0 ? (safeStats.attendanceToday.absent / safeStats.totalStudents * 100) : 0}%` 
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-slate-600 dark:text-slate-300">Late</span>
                <span className="font-semibold text-orange-600">{safeStats.attendanceToday.late}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3">
                <div 
                  className="bg-orange-500 h-3 rounded-full transition-all duration-500" 
                  style={{ 
                    width: `${safeStats.totalStudents > 0 ? (safeStats.attendanceToday.late / safeStats.totalStudents * 100) : 0}%` 
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-slate-600 dark:text-slate-300">Excused</span>
                <span className="font-semibold text-blue-600">{safeStats.attendanceToday.excused}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3">
                <div 
                  className="bg-blue-500 h-3 rounded-full transition-all duration-500" 
                  style={{ 
                    width: `${safeStats.totalStudents > 0 ? (safeStats.attendanceToday.excused / safeStats.totalStudents * 100) : 0}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white dark:bg-[#1a2632] rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Quick Actions</h3>
          </div>
          <div className="p-4 flex flex-col gap-2 flex-1">
            <Link href="/students/new" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <UserPlus className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Add New Student</span>
            </Link>
            <Link href="/staff/new" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                <UserCheck className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Add Staff Member</span>
            </Link>
            <Link href="/finance/config" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
                <Megaphone className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Send Announcement</span>
            </Link>
            <Link href="/exams/new" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600">
                <FileText className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Create Exam</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-[#1a2632] rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Activities</h3>
          <Link href="/finance/invoices" className="text-primary text-sm font-medium hover:underline">View All</Link>
        </div>
        <div className="p-4">
          <div className="space-y-4">
            {recentActivities && recentActivities.length > 0 ? (
              recentActivities.map((activity: any) => (
                <div key={activity.id} className="flex gap-3 items-start">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    activity.status === 'PAID' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600'
                  }`}>
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-700 dark:text-slate-200">
                      <span className="font-semibold">{activity.studentName}</span> - Invoice {activity.status.toLowerCase()}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Rs. {(activity.amount ?? 0).toLocaleString()} • {new Date(activity.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No recent activities</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

