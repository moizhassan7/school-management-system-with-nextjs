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
} from 'lucide-react';
import Link from 'next/link';

interface AdminDashboardProps {
  data: any;
}

export default function AdminDashboard({ data }: AdminDashboardProps) {
  const { stats = {}, recentActivities = [], academicYear } = data || {};

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

  const totalMarked =
    safeStats.attendanceToday.present +
    safeStats.attendanceToday.absent +
    safeStats.attendanceToday.late +
    safeStats.attendanceToday.excused;

  const pct = (n: number) =>
    safeStats.totalStudents > 0 ? (n / safeStats.totalStudents) * 100 : 0;

  return (
    <div className="page-content space-y-5">
      <div className="bento-grid">
        {/* Featured students tile */}
        <Link
          href="/students"
          className="bento-tile bento-tile-featured bento-span-2 flex cursor-pointer flex-col justify-between p-5 sm:p-6"
        >
          <div className="flex items-start justify-between">
            <div className="rounded-xl bg-white/15 p-2.5 backdrop-blur-sm">
              <Users className="h-6 w-6 text-white" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold text-white">
              <TrendingUp className="h-3 w-3" /> +{safeStats.recentEnrollments} this week
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-teal-100">Total Students</p>
            <h3 className="mt-1 font-heading text-4xl font-bold tracking-tight text-white">
              {safeStats.totalStudents}
            </h3>
            <p className="mt-2 text-sm text-teal-100/90">Open student directory →</p>
          </div>
        </Link>

        <Link href="/staff" className="bento-tile flex cursor-pointer flex-col justify-between p-5">
          <div className="flex items-start justify-between">
            <div className="rounded-xl bg-secondary p-2.5 text-primary">
              <UserCheck className="h-5 w-5" />
            </div>
            <span className="rounded-lg bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">Staff</span>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Staff Members</p>
            <h3 className="mt-1 font-heading text-3xl font-bold text-foreground">{safeStats.totalStaff}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{safeStats.totalTeachers} teachers</p>
          </div>
        </Link>

        <Link href="/finance/invoices" className="bento-tile flex cursor-pointer flex-col justify-between p-5">
          <div className="flex items-start justify-between">
            <div className="rounded-xl bg-accent p-2.5 text-cta">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="rounded-lg bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">Pending</span>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Unpaid Fees</p>
            <h3 className="mt-1 font-heading text-2xl font-bold text-foreground sm:text-3xl">
              Rs. {safeStats.unpaidAmount.toLocaleString()}
            </h3>
          </div>
        </Link>

        {/* Attendance overview — wide */}
        <div className="bento-tile bento-span-2 flex flex-col p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-heading text-lg font-semibold text-foreground">Today&apos;s Attendance</h3>
              <p className="text-sm text-muted-foreground">Live breakdown across all students</p>
            </div>
            <div className="flex items-center gap-2">
              {academicYear && (
                <span className="rounded-lg bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {academicYear.name}
                </span>
              )}
              <Link
                href="/attendance"
                className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
              >
                Open attendance
              </Link>
            </div>
          </div>

          <div className="mb-4 flex items-end gap-2">
            <span className="font-heading text-3xl font-bold text-foreground">{safeStats.attendanceToday.present}</span>
            <span className="mb-1 text-sm text-muted-foreground">present · {totalMarked} marked</span>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Present', value: safeStats.attendanceToday.present, color: 'bg-emerald-500' },
              { label: 'Absent', value: safeStats.attendanceToday.absent, color: 'bg-destructive' },
              { label: 'Late', value: safeStats.attendanceToday.late, color: 'bg-cta' },
              { label: 'Excused', value: safeStats.attendanceToday.excused, color: 'bg-primary' },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-semibold text-foreground">{row.value}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`${row.color} h-2.5 rounded-full transition-all duration-500`}
                    style={{ width: `${pct(row.value)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bento-tile bento-span-2 flex flex-col p-5 sm:p-6">
          <h3 className="mb-4 font-heading text-lg font-semibold text-foreground">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              { href: '/students/new', icon: UserPlus, label: 'Add New Student', tone: 'bg-primary/10 text-primary' },
              { href: '/staff/new', icon: UserCheck, label: 'Add Staff Member', tone: 'bg-secondary text-primary' },
              { href: '/finance/config', icon: Megaphone, label: 'Fee Configuration', tone: 'bg-accent text-cta' },
              { href: '/exams/new', icon: FileText, label: 'Create Exam', tone: 'bg-primary/10 text-primary' },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors hover:bg-muted/70"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.tone}`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-foreground">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="bento-tile col-span-1 flex flex-col p-5 sm:col-span-2 lg:col-span-4 lg:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-heading text-lg font-semibold text-foreground">Recent Activities</h3>
              <p className="text-sm text-muted-foreground">Latest invoice payments and dues</p>
            </div>
            <Link href="/finance/invoices" className="text-sm font-semibold text-primary hover:underline">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {recentActivities && recentActivities.length > 0 ? (
              recentActivities.map((activity: any) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/30 p-3"
                >
                  <div
                    className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                      activity.status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-accent text-cta'
                    }`}
                  >
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">{activity.studentName}</span>
                      {' — '}
                      Invoice {String(activity.status).toLowerCase()}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Rs. {(activity.amount ?? 0).toLocaleString()} ·{' '}
                      {new Date(activity.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border py-10 text-center">
                <CalendarCheck className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No recent activities</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
