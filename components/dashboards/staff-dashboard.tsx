'use client';

import { 
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
    <div className="page-content space-y-5">
      <div className="bento-grid">
        <div className="bento-tile bento-tile-featured bento-span-2 flex flex-col justify-between p-5 sm:p-6">
          <p className="text-sm text-teal-100">Staff portal</p>
          <div>
            <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl">Staff Dashboard</h2>
            <p className="mt-2 text-sm text-teal-100">
              {staffInfo?.designation || 'Staff Member'} · {staffInfo?.employmentType || 'Full Time'}
            </p>
          </div>
        </div>

        <div className="bento-tile flex flex-col justify-between p-5">
          <div className="rounded-xl bg-secondary p-2.5 text-primary w-fit">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Working Days</p>
            <h3 className="mt-1 font-heading text-3xl font-bold text-foreground">{stats?.workingDays || 0}</h3>
          </div>
        </div>

        <div className="bento-tile flex flex-col justify-between p-5">
          <div className="rounded-xl bg-accent p-2.5 text-cta w-fit">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pending Tasks</p>
            <h3 className="mt-1 font-heading text-3xl font-bold text-foreground">{stats?.pendingTasks || 0}</h3>
          </div>
        </div>

        <div className="bento-tile bento-span-2 flex flex-col p-5 sm:p-6 lg:col-span-3">
          <h3 className="mb-1 font-heading text-lg font-semibold text-foreground">Staff Information</h3>
          <p className="mb-4 text-sm text-muted-foreground">Your employment details</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              ['Designation', staffInfo?.designation || 'N/A'],
              ['Department', staffInfo?.department || 'N/A'],
              ['Employment Type', staffInfo?.employmentType || 'N/A'],
              ['Join Date', staffInfo?.joinDate ? new Date(staffInfo.joinDate).toLocaleDateString() : 'N/A'],
              ['Contact', staffInfo?.phone || 'N/A'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-muted/40 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bento-tile flex flex-col p-5">
          <h3 className="mb-3 font-heading text-lg font-semibold text-foreground">Quick Actions</h3>
          {[
            { href: '/staff/attendance', icon: Calendar, label: 'My Attendance' },
            { href: '/staff/leave', icon: FileText, label: 'Leave Application' },
            { href: '#', icon: ClipboardList, label: 'View Tasks' },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="mb-1 flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors hover:bg-muted/70"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                <action.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-foreground">{action.label}</span>
            </Link>
          ))}

          <div className="mt-4 rounded-xl bg-secondary/60 p-3">
            <div className="flex items-start gap-3">
              <Bell className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Important notice</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Check the staff portal for latest updates and announcements.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bento-tile col-span-1 p-5 sm:col-span-2 lg:col-span-4">
          <h3 className="mb-4 font-heading text-lg font-semibold text-foreground">Attendance Summary</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: 'Present', value: stats?.attendance?.present || 0, tone: 'bg-emerald-50 text-emerald-700' },
              { label: 'Absent', value: stats?.attendance?.absent || 0, tone: 'bg-destructive/10 text-destructive' },
              { label: 'Late', value: stats?.attendance?.late || 0, tone: 'bg-accent text-cta' },
              { label: 'On Leave', value: stats?.attendance?.leave || 0, tone: 'bg-secondary text-primary' },
            ].map((item) => (
              <div key={item.label} className={`rounded-xl p-4 text-center ${item.tone}`}>
                <p className="font-heading text-2xl font-bold">{item.value}</p>
                <p className="mt-1 text-sm opacity-80">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
