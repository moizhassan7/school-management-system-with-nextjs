'use client';

import { 
    Users,
    BookOpen,
    CalendarCheck,
    Wallet,
    Award,
    TrendingUp
} from 'lucide-react';
import Link from 'next/link';

interface ParentDashboardProps {
  data: any;
}

export default function ParentDashboard({ data }: ParentDashboardProps) {
  const { stats = {}, children = [] } = data || {};

  // Provide default values for all stats
  const safeStats = {
    totalChildren: stats.totalChildren ?? 0,
    totalDues: stats.totalDues ?? 0,
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Parent Portal</h2>
        <p className="text-purple-100">Managing {safeStats.totalChildren} {safeStats.totalChildren === 1 ? 'child' : 'children'}</p>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        {/* Total Children */}
        <div className="bg-white dark:bg-[#1a2632] p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-primary">
              <Users className="h-6 w-6" />
            </div>
            <span className="text-slate-500 text-xs font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Total</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">My Children</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{safeStats.totalChildren}</h3>
        </div>

        {/* Total Dues */}
        <Link href="#" className="bg-white dark:bg-[#1a2632] p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600">
              <Wallet className="h-6 w-6" />
            </div>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
              safeStats.totalDues > 0 
                ? 'text-red-600 bg-red-50 dark:bg-red-900/20' 
                : 'text-green-600 bg-green-50 dark:bg-green-900/20'
            }`}>
              {safeStats.totalDues > 0 ? 'Pending' : 'Paid'}
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Fee Dues</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {safeStats.totalDues > 0 ? `Rs. ${safeStats.totalDues.toLocaleString()}` : 'All Clear'}
          </h3>
        </Link>
      </div>

      {/* Children Details */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Children Overview</h3>
        </div>

        {children && children.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {children.map((child: any) => (
              <div key={child.id} className="bg-white dark:bg-[#1a2632] rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                {/* Child Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                      {child.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-lg">{child.name}</h4>
                      <p className="text-sm text-slate-500">
                        {child.className} - {child.sectionName} | Roll: {child.rollNumber}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Child Stats */}
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Attendance */}
                    <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <CalendarCheck className={`h-6 w-6 mx-auto mb-2 ${
                        child.attendancePercentage >= 75 ? 'text-green-600' : 'text-red-600'
                      }`} />
                      <p className="text-xs text-slate-500 mb-1">Attendance</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{child.attendancePercentage}%</p>
                    </div>

                    {/* Pending Fees */}
                    <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <Wallet className={`h-6 w-6 mx-auto mb-2 ${
                        (child.pendingFees ?? 0) > 0 ? 'text-orange-600' : 'text-green-600'
                      }`} />
                      <p className="text-xs text-slate-500 mb-1">Pending Fees</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {(child.pendingFees ?? 0) > 0 ? `Rs. ${(child.pendingFees ?? 0).toLocaleString()}` : 'Paid'}
                      </p>
                    </div>
                  </div>

                  {/* Recent Results */}
                  {child.recentResults && child.recentResults.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Recent Results
                      </h5>
                      <div className="space-y-2">
                        {child.recentResults.map((result: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded">
                            <span className="text-sm text-slate-600 dark:text-slate-400">{result.examName}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-semibold ${
                                result.percentage >= 80 ? 'text-green-600' :
                                result.percentage >= 60 ? 'text-blue-600' :
                                result.percentage >= 40 ? 'text-orange-600' :
                                'text-red-600'
                              }`}>
                                {result.grade || `${result.percentage}%`}
                              </span>
                              <TrendingUp className="h-3 w-3 text-slate-400" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button className="w-full py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                      View Detailed Report
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1a2632] rounded-lg border border-slate-200 dark:border-slate-800 p-12 text-center">
            <Users className="h-16 w-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
            <p className="text-slate-500">No children records found</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {safeStats.totalDues > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-600 flex-shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Payment Reminder</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                You have pending fee payments totaling Rs. {safeStats.totalDues.toLocaleString()}. Please clear your dues at your earliest convenience.
              </p>
              <button className="text-sm font-medium text-orange-600 hover:text-orange-700 underline">
                View Payment Details →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

