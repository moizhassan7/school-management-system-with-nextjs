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

  const safeStats = {
    totalRevenue: stats.totalRevenue ?? 0,
    pendingPayments: stats.pendingPayments ?? 0,
    collectedToday: stats.collectedToday ?? 0,
    overdueInvoices: stats.overdueInvoices ?? 0,
  };

  return (
    <div className="page-content space-y-5">
      <div className="bento-grid">
        <div className="bento-tile bento-tile-featured bento-span-2 flex flex-col justify-between p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div className="rounded-xl bg-white/15 p-2.5">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold text-white">
              <TrendingUp className="h-3 w-3" /> Total
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-teal-100">Total Revenue</p>
            <h3 className="mt-1 font-heading text-3xl font-bold text-white sm:text-4xl">
              Rs. {safeStats.totalRevenue.toLocaleString()}
            </h3>
          </div>
        </div>

        <Link href="/finance/invoices" className="bento-tile flex cursor-pointer flex-col justify-between p-5">
          <div className="flex items-start justify-between">
            <div className="rounded-xl bg-accent p-2.5 text-cta">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="rounded-lg bg-accent px-2 py-1 text-xs font-semibold text-cta">Pending</span>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
            <h3 className="mt-1 font-heading text-2xl font-bold text-foreground">
              Rs. {safeStats.pendingPayments.toLocaleString()}
            </h3>
          </div>
        </Link>

        <div className="bento-tile flex flex-col justify-between p-5">
          <div className="flex items-start justify-between">
            <div className="rounded-xl bg-secondary p-2.5 text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
            <span className="rounded-lg bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">Today</span>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Collected Today</p>
            <h3 className="mt-1 font-heading text-2xl font-bold text-foreground">
              Rs. {safeStats.collectedToday.toLocaleString()}
            </h3>
          </div>
        </div>

        <Link href="/finance/invoices" className="bento-tile flex cursor-pointer flex-col justify-between p-5">
          <div className="flex items-start justify-between">
            <div className="rounded-xl bg-destructive/10 p-2.5 text-destructive">
              <AlertCircle className="h-5 w-5" />
            </div>
            <span className="rounded-lg bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">Urgent</span>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Overdue Invoices</p>
            <h3 className="mt-1 font-heading text-3xl font-bold text-foreground">{safeStats.overdueInvoices}</h3>
          </div>
        </Link>

        <div className="bento-tile col-span-1 flex flex-col p-5 sm:col-span-2 lg:col-span-3 lg:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-heading text-lg font-semibold text-foreground">Recent Payments</h3>
            <Link href="/finance/collect" className="text-sm font-semibold text-primary hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-2 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Student</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Amount</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Method</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments && recentPayments.length > 0 ? (
                  recentPayments.map((payment: any) => (
                    <tr key={payment.id} className="border-b border-border/60 hover:bg-muted/40">
                      <td className="px-2 py-3 text-sm font-medium text-foreground">{payment.studentName}</td>
                      <td className="px-2 py-3 text-sm font-semibold text-emerald-600">Rs. {(payment.amount ?? 0).toLocaleString()}</td>
                      <td className="px-2 py-3 text-sm text-muted-foreground">{payment.method}</td>
                      <td className="px-2 py-3 text-sm text-muted-foreground">{new Date(payment.date).toLocaleDateString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">No recent payments</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bento-tile flex flex-col p-5">
          <h3 className="mb-3 font-heading text-lg font-semibold text-foreground">Quick Actions</h3>
          <div className="flex flex-col gap-1.5">
            {[
              { href: '/finance/collect', icon: CreditCard, label: 'Collect Fee', tone: 'bg-emerald-100 text-emerald-700' },
              { href: '/finance/invoices', icon: Wallet, label: 'View Invoices', tone: 'bg-accent text-cta' },
              { href: '/finance/invoices/generate', icon: DollarSign, label: 'Generate Invoices', tone: 'bg-secondary text-primary' },
              { href: '/finance/invoices/custom', icon: Wallet, label: 'Custom Challan', tone: 'bg-accent text-cta' },
              { href: '/parents', icon: AlertCircle, label: 'Parent Overview', tone: 'bg-primary/10 text-primary' },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex cursor-pointer items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted/70"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${action.tone}`}>
                  <action.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-foreground">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
