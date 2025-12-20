'use client';

import { 
    Users, 
    Calendar,
    ClipboardList,
    FileText,
    Bell
} from 'lucide-react';
import Link from 'next/link';

interface StaffDashboardProps {
  data: any;
}

export default function StaffDashboard({ data }: StaffDashboardProps) {
  const { stats, staffInfo } = data;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Staff Dashboard</h2>
        <p className="text-indigo-100">
          {staffInfo?.designation || 'Staff Member'} - {staffInfo?.employmentType || 'Full Time'}
        </p>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Working Days */}
        <div className="bg-white dark:bg-[#1a2632] p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-primary">
              <Calendar className="h-6 w-6" />
            </div>
            <span className="text-slate-500 text-xs font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">This Month</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Working Days</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {stats?.workingDays || 0}
          </h3>
        </div>

        {/* Department */}
        <div className="bg-white dark:bg-[#1a2632] p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
              <Users className="h-6 w-6" />
            </div>
            <span className="text-slate-500 text-xs font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Info</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Department</p>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
            {staffInfo?.department || 'Administrative'}
          </h3>
        </div>

        {/* Tasks */}
        <div className="bg-white dark:bg-[#1a2632] p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg text-teal-600">
              <ClipboardList className="h-6 w-6" />
            </div>
            <span className="text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-2 py-1 rounded text-xs font-semibold">Active</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Pending Tasks</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {stats?.pendingTasks || 0}
          </h3>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Staff Information */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1a2632] rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Staff Information</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Your employment details</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Employee ID</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {staffInfo?.employeeId || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Designation</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {staffInfo?.designation || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Department</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {staffInfo?.department || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Employment Type</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {staffInfo?.employmentType || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Join Date</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {staffInfo?.joinDate ? new Date(staffInfo.joinDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Contact</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {staffInfo?.phone || 'N/A'}
                </p>
              </div>
            </div>

            {/* Emergency Contact */}
            {staffInfo?.emergencyContact && (
              <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Emergency Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Name</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {staffInfo.emergencyContact.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Phone</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {staffInfo.emergencyContact.phone}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & Notices */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white dark:bg-[#1a2632] rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Quick Actions</h3>
            </div>
            <div className="p-4 flex flex-col gap-2">
              <Link href="/attendance" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">My Attendance</span>
              </Link>
              <Link href="#" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Leave Application</span>
              </Link>
              <Link href="#" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">View Tasks</span>
              </Link>
            </div>
          </div>

          {/* Recent Notices */}
          <div className="bg-white dark:bg-[#1a2632] rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Notices</h3>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Bell className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      Important Notice
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Check the staff portal for latest updates and announcements.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Summary */}
      <div className="bg-white dark:bg-[#1a2632] rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Attendance Summary</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Current month overview</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-2xl font-bold text-green-600 mb-1">
                {stats?.attendance?.present || 0}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Present</p>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-2xl font-bold text-red-600 mb-1">
                {stats?.attendance?.absent || 0}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Absent</p>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <p className="text-2xl font-bold text-orange-600 mb-1">
                {stats?.attendance?.late || 0}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Late</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-2xl font-bold text-blue-600 mb-1">
                {stats?.attendance?.leave || 0}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">On Leave</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

