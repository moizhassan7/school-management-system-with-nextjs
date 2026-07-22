'use client';

import { 
    Users,
    CalendarCheck,
    Wallet,
    Award,
    TrendingUp
} from 'lucide-react';

interface ParentDashboardProps {
  data: any;
}

export default function ParentDashboard({ data }: ParentDashboardProps) {
  const { stats = {}, children = [] } = data || {};

  const safeStats = {
    totalChildren: stats.totalChildren ?? 0,
    totalDues: stats.totalDues ?? 0,
  };

  return (
    <div className="page-content space-y-5">
      <div className="bento-grid">
        <div className="bento-tile bento-tile-featured bento-span-2 flex flex-col justify-between p-5 sm:p-6">
          <p className="text-sm text-teal-100">Parent portal</p>
          <div>
            <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl">Your children</h2>
            <p className="mt-2 text-sm text-teal-100">
              Managing {safeStats.totalChildren} {safeStats.totalChildren === 1 ? 'child' : 'children'}
            </p>
          </div>
        </div>

        <div className="bento-tile flex flex-col justify-between p-5">
          <div className="rounded-xl bg-secondary p-2.5 text-primary w-fit">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">My Children</p>
            <h3 className="mt-1 font-heading text-3xl font-bold text-foreground">{safeStats.totalChildren}</h3>
          </div>
        </div>

        <div className="bento-tile flex flex-col justify-between p-5">
          <div className="rounded-xl bg-accent p-2.5 text-cta w-fit">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Fee Dues</p>
            <h3 className="mt-1 font-heading text-2xl font-bold text-foreground">
              {safeStats.totalDues > 0 ? `Rs. ${safeStats.totalDues.toLocaleString()}` : 'All Clear'}
            </h3>
          </div>
        </div>

        {children && children.length > 0 ? (
          children.map((child: any) => (
            <div key={child.id} className="bento-tile bento-span-2 flex flex-col p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary font-heading text-lg font-bold text-primary-foreground">
                  {child.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-heading text-lg font-semibold text-foreground">{child.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {child.className} - {child.sectionName} | Roll: {child.rollNumber}
                  </p>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/50 p-3 text-center">
                  <CalendarCheck className={`mx-auto mb-2 h-5 w-5 ${
                    child.attendancePercentage >= 75 ? 'text-emerald-600' : 'text-destructive'
                  }`} />
                  <p className="text-xs text-muted-foreground">Attendance</p>
                  <p className="font-heading text-lg font-bold text-foreground">{child.attendancePercentage}%</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3 text-center">
                  <Wallet className={`mx-auto mb-2 h-5 w-5 ${
                    (child.pendingFees ?? 0) > 0 ? 'text-cta' : 'text-emerald-600'
                  }`} />
                  <p className="text-xs text-muted-foreground">Pending Fees</p>
                  <p className="font-heading text-lg font-bold text-foreground">
                    {(child.pendingFees ?? 0) > 0 ? `Rs. ${(child.pendingFees ?? 0).toLocaleString()}` : 'Paid'}
                  </p>
                </div>
              </div>

              {child.recentResults && child.recentResults.length > 0 && (
                <div>
                  <h5 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Award className="h-4 w-4" />
                    Recent Results
                  </h5>
                  <div className="space-y-2">
                    {child.recentResults.map((result: any, index: number) => (
                      <div key={index} className="flex items-center justify-between rounded-lg bg-muted/40 p-2">
                        <span className="text-sm text-muted-foreground">{result.examName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {result.grade || `${result.percentage}%`}
                          </span>
                          <TrendingUp className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bento-tile col-span-1 p-12 text-center sm:col-span-2 lg:col-span-4">
            <Users className="mx-auto mb-4 h-14 w-14 text-muted-foreground/40" />
            <p className="text-muted-foreground">No children records found</p>
          </div>
        )}

        {safeStats.totalDues > 0 && (
          <div className="bento-tile col-span-1 border-cta/30 bg-accent/50 p-5 sm:col-span-2 lg:col-span-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent text-cta">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Payment reminder</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pending fee payments total Rs. {safeStats.totalDues.toLocaleString()}. Clear dues at your earliest convenience.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
