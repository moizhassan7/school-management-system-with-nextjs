'use client';

import { 
    Users, 
    BookOpen,
    CalendarCheck,
    FileText,
    ClipboardList
} from 'lucide-react';
import Link from 'next/link';

interface TeacherDashboardProps {
  data: any;
}

export default function TeacherDashboard({ data }: TeacherDashboardProps) {
  const { stats = {}, sections = [] } = data || {};

  const safeStats = {
    mySections: stats.mySections ?? 0,
    totalStudents: stats.totalStudents ?? 0,
    todayClasses: stats.todayClasses ?? 0,
    attendanceToday: {
      present: stats.attendanceToday?.present ?? 0,
      absent: stats.attendanceToday?.absent ?? 0,
      late: stats.attendanceToday?.late ?? 0,
      excused: stats.attendanceToday?.excused ?? 0,
    }
  };

  return (
    <div className="page-content space-y-5">
      <div className="bento-grid">
        <div className="bento-tile bento-tile-featured flex flex-col justify-between p-5">
          <div className="rounded-xl bg-white/15 p-2.5 w-fit">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-teal-100">My Sections</p>
            <h3 className="mt-1 font-heading text-4xl font-bold text-white">{safeStats.mySections}</h3>
          </div>
        </div>

        <div className="bento-tile flex flex-col justify-between p-5">
          <div className="rounded-xl bg-secondary p-2.5 text-primary w-fit">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Students</p>
            <h3 className="mt-1 font-heading text-3xl font-bold text-foreground">{safeStats.totalStudents}</h3>
          </div>
        </div>

        <div className="bento-tile flex flex-col justify-between p-5">
          <div className="rounded-xl bg-accent p-2.5 text-cta w-fit">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Classes Today</p>
            <h3 className="mt-1 font-heading text-3xl font-bold text-foreground">{safeStats.todayClasses}</h3>
          </div>
        </div>

        <div className="bento-tile flex flex-col justify-between p-5">
          <h3 className="font-heading text-sm font-semibold text-foreground">Today&apos;s Attendance</h3>
          <div className="mt-3 space-y-2">
            {[
              ['Present', safeStats.attendanceToday.present, 'text-emerald-600'],
              ['Absent', safeStats.attendanceToday.absent, 'text-destructive'],
              ['Late', safeStats.attendanceToday.late, 'text-cta'],
              ['Excused', safeStats.attendanceToday.excused, 'text-primary'],
            ].map(([label, value, color]) => (
              <div key={String(label)} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className={`font-semibold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bento-tile bento-span-2 flex flex-col p-5 sm:p-6 lg:col-span-3">
          <h3 className="mb-1 font-heading text-lg font-semibold text-foreground">My Sections</h3>
          <p className="mb-4 text-sm text-muted-foreground">Sections assigned to you</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {sections && sections.length > 0 ? (
              sections.map((section: any) => (
                <div key={section.id} className="rounded-xl border border-border/70 bg-muted/30 p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{section.name}</h4>
                      <p className="text-xs text-muted-foreground">{section.studentsCount} students</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/attendance" className="flex-1 cursor-pointer rounded-lg bg-primary py-2 text-center text-xs font-medium text-primary-foreground hover:bg-primary/90">
                      Take Attendance
                    </Link>
                    <Link href="/exams/marks-entry" className="flex-1 cursor-pointer rounded-lg bg-muted py-2 text-center text-xs font-medium text-foreground hover:bg-muted/80">
                      Enter Marks
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 py-10 text-center text-muted-foreground">
                <BookOpen className="mx-auto mb-3 h-12 w-12 opacity-30" />
                <p>No sections assigned yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="bento-tile flex flex-col p-5">
          <h3 className="mb-3 font-heading text-lg font-semibold text-foreground">Quick Actions</h3>
          {[
            { href: '/attendance', icon: CalendarCheck, label: 'Mark Attendance' },
            { href: '/exams/marks-entry', icon: FileText, label: 'Enter Marks' },
            { href: '/exams/results/report-card', icon: ClipboardList, label: 'View Results' },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="mb-1 flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors hover:bg-muted/70"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                <action.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-foreground">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
