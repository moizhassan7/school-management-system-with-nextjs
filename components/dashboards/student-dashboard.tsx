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

  const safeStats = {
    className: stats.className ?? 'N/A',
    sectionName: stats.sectionName ?? 'N/A',
    rollNumber: stats.rollNumber ?? 'N/A',
    attendancePercentage: stats.attendancePercentage ?? 0,
    pendingFees: stats.pendingFees ?? 0,
    totalExams: stats.totalExams ?? 0,
  };

  return (
    <div className="page-content space-y-5">
      <div className="bento-grid">
        <div className="bento-tile bento-tile-featured bento-span-2 flex flex-col justify-between p-5 sm:p-6">
          <p className="text-sm font-medium text-teal-100">Your academic home</p>
          <div>
            <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl">Welcome back</h2>
            <p className="mt-2 text-sm text-teal-100">
              Class {safeStats.className} · {safeStats.sectionName} · Roll {safeStats.rollNumber}
            </p>
          </div>
        </div>

        <Link href="/portal/student/attendance" className="bento-tile flex cursor-pointer flex-col justify-between p-5">
          <div className="flex items-start justify-between">
            <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${
              safeStats.attendancePercentage >= 75
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-destructive/10 text-destructive'
            }`}>
              {safeStats.attendancePercentage >= 75 ? 'Good' : 'Low'}
            </span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Attendance</p>
            <h3 className="mt-1 font-heading text-3xl font-bold text-foreground">{safeStats.attendancePercentage}%</h3>
          </div>
        </Link>

        <Link href="/portal/student/fees" className="bento-tile flex cursor-pointer flex-col justify-between p-5">
          <div className="rounded-xl bg-accent p-2.5 text-cta w-fit">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Fees Status</p>
            <h3 className="mt-1 font-heading text-2xl font-bold text-foreground">
              {safeStats.pendingFees > 0 ? `Rs. ${safeStats.pendingFees.toLocaleString()}` : 'All Clear'}
            </h3>
          </div>
        </Link>

        <Link href="/portal/student/results" className="bento-tile flex cursor-pointer flex-col justify-between p-5">
          <div className="rounded-xl bg-secondary p-2.5 text-primary w-fit">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Exams Taken</p>
            <h3 className="mt-1 font-heading text-3xl font-bold text-foreground">{safeStats.totalExams}</h3>
          </div>
        </Link>

        <div className="bento-tile flex flex-col p-5">
          <h3 className="mb-3 font-heading text-lg font-semibold text-foreground">Academic Info</h3>
          <div className="space-y-3">
            {[
              ['Class', safeStats.className],
              ['Section', safeStats.sectionName],
              ['Roll Number', safeStats.rollNumber],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="text-sm font-medium text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bento-tile bento-span-2 flex flex-col p-5 sm:p-6 lg:col-span-3">
          <h3 className="mb-1 font-heading text-lg font-semibold text-foreground">Recent Exam Results</h3>
          <p className="mb-4 text-sm text-muted-foreground">Your latest exam performances</p>
          {recentResults && recentResults.length > 0 ? (
            <div className="space-y-3">
              {recentResults.map((result: any) => (
                <div key={result.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 font-heading text-sm font-bold text-primary">
                      {result.grade || `${result.percentage}%`}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{result.examName}</h4>
                      <p className="text-sm text-muted-foreground">{new Date(result.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-medium">{result.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Award className="mx-auto mb-4 h-14 w-14 text-muted-foreground/40" />
              <p className="text-muted-foreground">No exam results available yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
