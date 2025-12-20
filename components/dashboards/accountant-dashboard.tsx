'use client';

import { 
    Wallet, 
    TrendingUp,
    CreditCard,
    AlertCircle,
    DollarSign
} from 'lucide-react';
import Link from 'next/link';

interface AccountantDashboardProps {
  data: any;
}

export default function AccountantDashboard({ data }: AccountantDashboardProps) {
  const { stats = {}, recentPayments = [] } = data || {};

  // Provide default values for all stats
  const safeStats = {
    totalRevenue: stats.totalRevenue ?? 0,
    pendingPayments: stats.pendingPayments ?? 0,
    collectedToday: stats.collectedToday ?? 0,
    overdueInvoices: stats.overdueInvoices ?? 0,
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white dark:bg-[#1a2632] p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <span className="text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Total
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Revenue</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Rs. {safeStats.totalRevenue.toLocaleString()}</h3>
        </div>

        {/* Pending Payments */}
        <Link href="/finance/invoices" className="bg-white dark:bg-[#1a2632] p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600">
              <Wallet className="h-6 w-6" />
            </div>
            <span className="text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded text-xs font-semibold">Pending</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Pending Payments</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Rs. {safeStats.pendingPayments.toLocaleString()}</h3>
        </Link>

        {/* Collected Today */}
        <div className="bg-white dark:bg-[#1a2632] p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
              <CreditCard className="h-6 w-6" />
            </div>
            <span className="text-slate-500 text-xs font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Today</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Collected Today</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Rs. {safeStats.collectedToday.toLocaleString()}</h3>
        </div>

        {/* Overdue Invoices */}
        <Link href="/finance/invoices" className="bg-white dark:bg-[#1a2632] p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <span className="text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded text-xs font-semibold">Urgent</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Overdue Invoices</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{safeStats.overdueInvoices}</h3>
        </Link>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Payments */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1a2632] rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Payments</h3>
            <Link href="/finance/collect" className="text-primary text-sm font-medium hover:underline">View All</Link>
          </div>
          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase">Student</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase">Method</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments && recentPayments.length > 0 ? (
                    recentPayments.map((payment: any) => (
                      <tr key={payment.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-2 text-sm text-slate-700 dark:text-slate-200 font-medium">{payment.studentName}</td>
                        <td className="py-3 px-2 text-sm text-green-600 font-semibold">Rs. {(payment.amount ?? 0).toLocaleString()}</td>
                        <td className="py-3 px-2 text-sm text-slate-500">{payment.method}</td>
                        <td className="py-3 px-2 text-sm text-slate-500">{new Date(payment.date).toLocaleDateString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-slate-500">No recent payments</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-[#1a2632] rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Quick Actions</h3>
          </div>
          <div className="p-4 flex flex-col gap-2 flex-1">
            <Link href="/finance/collect" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                <CreditCard className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Collect Fee</span>
            </Link>
            <Link href="/finance/invoices" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
                <Wallet className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">View Invoices</span>
            </Link>
            <Link href="/finance/invoices/generate" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                <DollarSign className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Generate Invoices</span>
            </Link>
            <Link href="/parents" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                <AlertCircle className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Parent Overview</span>
            </Link>
            <Link href="/finance/discounts" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600">
                <TrendingUp className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Manage Discounts</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

