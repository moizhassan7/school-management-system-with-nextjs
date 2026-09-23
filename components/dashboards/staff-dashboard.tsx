'use client';

import { Bell } from 'lucide-react';

interface StaffDashboardProps {
  data: any;
}

export default function StaffDashboard({ data }: StaffDashboardProps) {
  const { staffInfo } = data;

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

        <div className="bento-tile bento-span-2 flex flex-col p-5 sm:p-6">
          <h3 className="mb-3 font-heading text-lg font-semibold text-foreground">Profile</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              ['Department', staffInfo?.department || 'N/A'],
              ['Qualification', staffInfo?.qualification || 'N/A'],
              ['Joined', staffInfo?.joiningDate ? new Date(staffInfo.joiningDate).toLocaleDateString() : 'N/A'],
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
          <div className="rounded-xl bg-secondary/60 p-3">
            <div className="flex items-start gap-3">
              <Bell className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Staff workspace</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Use the sidebar for modules available to your role. Attendance and leave self-service are
                  not enabled in this release.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
