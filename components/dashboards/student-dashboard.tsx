'use client';

import { 
    BookOpen,
    CalendarCheck,
    Award,
    Wallet,
    TrendingUp
} from 'lucide-react';
import Link from 'next/link';

interface StudentDashboardProps {
  data: any;  
}

export default function StudentDashboard({ data }: StudentDashboardProps) {
  const { stats = {}, recentResults = [] } = data || {};

  // Provide default values for all stats
  const safeStats = {
    className: stats.className ?? 'N/A',
    sectionName: stats.sectionName ?? 'N/A',
    rollNumber: stats.rollNumber ?? 'N/A',
    attendancePercentage: stats.attendancePercentage ?? 0,
    pendingFees: stats.pendingFees ?? 0,
    totalExams: stats.totalExams ?? 0,
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary to-blue-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Welcome to Your Dashboard</h2>
        <p className="text-blue-100">Class: {safeStats.className} - {safeStats.sectionName} | Roll No: {safeStats.rollNumber}</p>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance */}
        <div className="bg-white dark:bg-[#1a2632] p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600">
              <CalendarCheck className="h-6 w-6" />
            </div>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
              safeStats.attendancePercentage >= 75 
                ? 'text-green-600 bg-green-50 dark:bg-green-900/20' 
                : 'text-red-600 bg-red-50 dark:bg-red-900/20'
            }`}>
              {safeStats.attendancePercentage >= 75 ? 'Good' : 'Low'}
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Attendance</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{safeStats.attendancePercentage}%</h3>
        </div>

        {/* Pending Fees */}
        <Link href="#" className="bg-white dark:bg-[#1a2632] p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600">
              <Wallet className="h-6 w-6" />
            </div>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
              safeStats.pendingFees > 0 
                ? 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' 
                : 'text-green-600 bg-green-50 dark:bg-green-900/20'
            }`}>
              {safeStats.pendingFees > 0 ? 'Pending' : 'Paid'}
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Fees Status</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {safeStats.pendingFees > 0 ? `Rs. ${safeStats.pendingFees.toLocaleString()}` : 'All Clear'}
          </h3>
        </Link>

        {/* Total Exams */}
        <div className="bg-white dark:bg-[#1a2632] p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
              <BookOpen className="h-6 w-6" />
            </div>
            <span className="text-slate-500 text-xs font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Total</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Exams Taken</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{safeStats.totalExams}</h3>
        </div>

        {/* Latest Grade */}
        {recentResults && recentResults.length > 0 && (
          <div className="bg-white dark:bg-[#1a2632] p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                <Award className="h-6 w-6" />
              </div>
              <span className="text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded text-xs font-semibold">Latest</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Recent Performance</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {recentResults[0].grade || `${recentResults[0].percentage}%`}
            </h3>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Exam Results */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1a2632] rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Exam Results</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Your latest exam performances</p>
          </div>
          <div className="p-4">
            {recentResults && recentResults.length > 0 ? (
              <div className="space-y-4">
                {recentResults.map((result: any, index: number) => (
                  <div key={result.id} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${
                        result.percentage >= 80 ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                        result.percentage >= 60 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                        result.percentage >= 40 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' :
                        'bg-red-100 dark:bg-red-900/30 text-red-600'
                      }`}>
                        {result.grade || `${result.percentage}%`}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">{result.examName}</h4>
                        <p className="text-sm text-slate-500">{new Date(result.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm font-medium">{result.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Award className="h-16 w-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                <p className="text-slate-500">No exam results available yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Academic Info & Quick Links */}
        <div className="space-y-6">
          {/* Academic Info */}
          <div className="bg-white dark:bg-[#1a2632] rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Academic Info</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Class</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{safeStats.className}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Section</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{safeStats.sectionName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Roll Number</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{safeStats.rollNumber}</p>
              </div>
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="bg-white dark:bg-[#1a2632] rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Attendance Summary</h3>
            </div>
            <div className="p-4">
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block text-slate-600 dark:text-slate-400">
                      Last 30 Days
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold inline-block text-green-600">
                      {safeStats.attendancePercentage}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-slate-200 dark:bg-slate-700">
                  <div 
                    style={{ width: `${safeStats.attendancePercentage}%` }} 
                    className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                      safeStats.attendancePercentage >= 75 ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {safeStats.attendancePercentage >= 75 
                  ? '✓ Meeting minimum attendance requirement' 
                  : '⚠ Below minimum attendance requirement'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

