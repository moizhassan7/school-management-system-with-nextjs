'use client';

import { 
    Users, 
    BookOpen,
    CalendarCheck,
    FileText,
    ClipboardList
} from 'lucide-react';
import Link from 'next/link';

interface TeacherDashboardProps {
  data: any;
}

export default function TeacherDashboard({ data }: TeacherDashboardProps) {
  const { stats = {}, sections = [] } = data || {};

  // Provide default values for all stats
  const safeStats = {
    mySections: stats.mySections ?? 0,
    totalStudents: stats.totalStudents ?? 0,
    todayClasses: stats.todayClasses ?? 0,
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* My Sections */}
        <div className="bg-white dark:bg-[#1a2632] p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-primary">
              <BookOpen className="h-6 w-6" />
            </div>
            <span className="text-slate-500 text-xs font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Active</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">My Sections</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{safeStats.mySections}</h3>
        </div>

        {/* Total Students */}
        <div className="bg-white dark:bg-[#1a2632] p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
              <Users className="h-6 w-6" />
            </div>
            <span className="text-slate-500 text-xs font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Total</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Students</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{safeStats.totalStudents}</h3>
        </div>

        {/* Today's Classes */}
        <div className="bg-white dark:bg-[#1a2632] p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg text-teal-600">
              <CalendarCheck className="h-6 w-6" />
            </div>
            <span className="text-slate-500 text-xs font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Today</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Classes Today</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{safeStats.todayClasses}</h3>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Sections List */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1a2632] rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">My Sections</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sections assigned to you</p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sections && sections.length > 0 ? (
                sections.map((section: any) => (
                  <div key={section.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white">{section.name}</h4>
                          <p className="text-xs text-slate-500">{section.studentsCount} students</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Link 
                        href="/attendance" 
                        className="flex-1 text-center text-xs py-2 px-3 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
                      >
                        Take Attendance
                      </Link>
                      <Link 
                        href="/exams/marks-entry" 
                        className="flex-1 text-center text-xs py-2 px-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        Enter Marks
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-8 text-slate-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No sections assigned yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Attendance Overview & Quick Actions */}
        <div className="space-y-6">
          {/* Today's Attendance */}
          <div className="bg-white dark:bg-[#1a2632] rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Today&apos;s Attendance</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Present</span>
                <span className="text-sm font-semibold text-green-600">{safeStats.attendanceToday.present}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Absent</span>
                <span className="text-sm font-semibold text-red-600">{safeStats.attendanceToday.absent}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Late</span>
                <span className="text-sm font-semibold text-orange-600">{safeStats.attendanceToday.late}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 dark:text-slate-400">Excused</span>
                <span className="text-sm font-semibold text-blue-600">{safeStats.attendanceToday.excused}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-[#1a2632] rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Quick Actions</h3>
            </div>
            <div className="p-4 flex flex-col gap-2">
              <Link href="/attendance" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Mark Attendance</span>
              </Link>
              <Link href="/exams/marks-entry" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Enter Marks</span>
              </Link>
              <Link href="/exams/results/report-card" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">View Results</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

