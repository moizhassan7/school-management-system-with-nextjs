'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState } from 'react';
import {
  Users,
  Banknote,
  Calendar,
  Settings,
  LogOut,
  ChevronRight,
  ChevronDown,
  BookOpen,
  FileText,
  Receipt,
  Award,
  ClipboardCheck,
  CreditCard,
  FileSpreadsheet,
  FileBarChart,
  Home,
  Shield,
  Plus,
  ClipboardList,
} from 'lucide-react';
import { can } from '@/lib/permissions';
import { useSchoolBrand } from '@/contexts/SchoolBrandContext';

export interface NavUser {
  name?: string | null;
  email?: string | null;
  role?: string;
  schoolId?: string;
  permissions?: string[];
  campusIds?: string[];
}

interface AppNavProps {
  user: NavUser;
  onNavigate?: () => void;
  className?: string;
}

export function AppNav({ user, onNavigate, className }: AppNavProps) {
  const pathname = usePathname();
  const { brand } = useSchoolBrand();
  const userRole = user.role || 'GUEST';

  const [isFinanceExpanded, setIsFinanceExpanded] = useState(
    () => pathname.startsWith('/finance') || pathname.startsWith('/parents')
  );
  const [isExamsExpanded, setIsExamsExpanded] = useState(() => pathname.startsWith('/exams'));

  const isActive = (path: string) => pathname === path;
  const isPathActive = (path: string) => pathname.startsWith(path);

  const canDashboard = can(user, 'DASHBOARD', 'VIEW');
  const canStudents = can(user, 'STUDENTS', 'VIEW');
  const canTeachers = can(user, 'TEACHERS', 'VIEW');
  const canFees = can(user, 'FEES', 'VIEW');
  const canExams = can(user, 'EXAMS', 'VIEW');
  const canAttendance = can(user, 'ATTENDANCE', 'VIEW');
  const canConfig = can(user, 'CONFIGURATION', 'VIEW');
  const canUsers = can(user, 'USERS', 'VIEW');
  const isStudent = userRole === 'STUDENT';
  const isParent = userRole === 'PARENT';
  const isStaff = userRole === 'STAFF';

  const go = () => onNavigate?.();

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const linkClass = (active: boolean) =>
    `flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-200 ${
      active
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
    }`;

  const subLinkClass = (active: boolean) =>
    `flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
      active
        ? 'bg-primary/10 font-medium text-primary'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`;

  return (
    <aside
      className={
        className ||
        'flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground'
      }
    >
      <div className="border-b border-sidebar-border p-5">
        <div className="flex items-center gap-3 font-heading text-lg font-semibold tracking-tight text-foreground">
          <Image
            src={brand.logoPath || '/logo/logo.png'}
            alt={`${brand.name} Logo`}
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
            priority
            unoptimized={brand.logoPath?.startsWith('/uploads/')}
          />
          <span className="truncate">{brand.name}</span>
        </div>
        <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {userRole.replace('_', ' ')} Portal
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin" aria-label="Main">
        {canDashboard && (
          <Link href="/" className={linkClass(isActive('/'))} onClick={go}>
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
        )}

        {canStudents && (
          <Link href="/students" className={linkClass(isPathActive('/students'))} onClick={go}>
            <Users className="h-4 w-4" />
            Students
          </Link>
        )}

        {canTeachers && (
          <Link href="/staff" className={linkClass(isPathActive('/staff'))} onClick={go}>
            <Users className="h-4 w-4" />
            Staff
          </Link>
        )}

        {canAttendance && !isStaff && (
          <Link href="/attendance" className={linkClass(isPathActive('/attendance'))} onClick={go}>
            <Calendar className="h-4 w-4" />
            Attendance
          </Link>
        )}

        {isStudent && (
          <>
            <Link
              href="/portal/student/results"
              className={linkClass(isPathActive('/portal/student/results'))}
              onClick={go}
            >
              <Award className="h-4 w-4" />
              My Results
            </Link>
            <Link
              href="/portal/student/attendance"
              className={linkClass(isPathActive('/portal/student/attendance'))}
              onClick={go}
            >
              <Calendar className="h-4 w-4" />
              My Attendance
            </Link>
            <Link
              href="/portal/student/fees"
              className={linkClass(isPathActive('/portal/student/fees'))}
              onClick={go}
            >
              <Banknote className="h-4 w-4" />
              Fee Status
            </Link>
          </>
        )}

        {isParent && (
          <>
            <Link href="/portal/parent" className={linkClass(isPathActive('/portal/parent'))} onClick={go}>
              <Users className="h-4 w-4" />
              My Children
            </Link>
            <Link
              href="/portal/parent/fees"
              className={linkClass(isPathActive('/portal/parent/fees'))}
              onClick={go}
            >
              <Banknote className="h-4 w-4" />
              Fee Status
            </Link>
          </>
        )}

        {canFees && (
          <div>
            <button
              type="button"
              onClick={() => setIsFinanceExpanded(!isFinanceExpanded)}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                isPathActive('/finance') || isPathActive('/parents')
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <Banknote className="h-4 w-4" />
              <span className="flex-1 text-left">Finance</span>
              {isFinanceExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>

            {isFinanceExpanded && (
              <div className="mt-1 ml-4 space-y-1 border-l border-border pl-3">
                <Link href="/finance/config" className={subLinkClass(isActive('/finance/config'))} onClick={go}>
                  <Settings className="h-3.5 w-3.5" /> Configuration
                </Link>
                <Link
                  href="/finance/invoices/generate"
                  className={subLinkClass(isActive('/finance/invoices/generate'))}
                  onClick={go}
                >
                  <Plus className="h-3.5 w-3.5" /> Generate Invoices
                </Link>
                <Link
                  href="/finance/invoices/custom"
                  className={subLinkClass(isActive('/finance/invoices/custom'))}
                  onClick={go}
                >
                  <Receipt className="h-3.5 w-3.5" /> Custom Challan
                </Link>
                <Link href="/finance/invoices" className={subLinkClass(isActive('/finance/invoices'))} onClick={go}>
                  <FileText className="h-3.5 w-3.5" /> Invoices
                </Link>
                <Link href="/finance/collect" className={subLinkClass(isActive('/finance/collect'))} onClick={go}>
                  <CreditCard className="h-3.5 w-3.5" /> Collect Fees
                </Link>
                <Link href="/parents" className={subLinkClass(isPathActive('/parents'))} onClick={go}>
                  <Users className="h-3.5 w-3.5" /> Parents
                </Link>
              </div>
            )}
          </div>
        )}

        {canExams && (
          <div>
            <button
              type="button"
              onClick={() => setIsExamsExpanded(!isExamsExpanded)}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                isPathActive('/exams')
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span className="flex-1 text-left">Academics & Exams</span>
              {isExamsExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>

            {isExamsExpanded && (
              <div className="mt-1 ml-4 space-y-1 border-l border-border pl-3">
                <Link
                  href="/exams/grading-systems"
                  className={subLinkClass(isActive('/exams/grading-systems'))}
                  onClick={go}
                >
                  <Award className="h-3.5 w-3.5" /> Grading Rules
                </Link>
                <Link href="/exams/configure" className={subLinkClass(isActive('/exams/configure'))} onClick={go}>
                  <ClipboardCheck className="h-3.5 w-3.5" /> Exam Setup
                </Link>
                {can(user, 'EXAMS', 'CREATE') && (
                  <Link href="/exams/new" className={subLinkClass(isActive('/exams/new'))} onClick={go}>
                    <Plus className="h-3.5 w-3.5" /> Create Exam
                  </Link>
                )}
                <Link href="/exams/class-tests" className={subLinkClass(isActive('/exams/class-tests'))} onClick={go}>
                  <ClipboardList className="h-3.5 w-3.5" /> Class Tests
                </Link>
                <Link href="/exams/marks-entry" className={subLinkClass(isActive('/exams/marks-entry'))} onClick={go}>
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Marks Entry
                </Link>
                <Link
                  href="/exams/results/report-card"
                  className={subLinkClass(isActive('/exams/results/report-card'))}
                  onClick={go}
                >
                  <FileBarChart className="h-3.5 w-3.5" /> Report Cards
                </Link>
                <Link
                  href="/exams/results/gazette"
                  className={subLinkClass(isActive('/exams/results/gazette'))}
                  onClick={go}
                >
                  <FileText className="h-3.5 w-3.5" /> Results Gazette
                </Link>
              </div>
            )}
          </div>
        )}

        {(canUsers || canConfig) && (
          <div className="pt-4">
            <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Administration
            </div>
            {canUsers && (
              <Link href="/users" className={linkClass(isPathActive('/users'))} onClick={go}>
                <Shield className="h-4 w-4" />
                User Management
              </Link>
            )}
            {canConfig && (
              <Link
                href="/configuration"
                className={linkClass(isPathActive('/configuration') || isPathActive('/subject-groups'))}
                onClick={go}
              >
                <Settings className="h-4 w-4" />
                Configuration
              </Link>
            )}
          </div>
        )}
      </nav>

      <div className="border-t border-sidebar-border bg-muted/40 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-sm ring-2 ring-card">
            {user.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-foreground">{user.name || 'User'}</p>
            <p className="truncate text-xs text-muted-foreground" title={user.email || ''}>
              {user.email || 'No Email'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="cursor-pointer rounded-xl p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Sign Out"
            type="button"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="border-t border-sidebar-border py-2 text-center text-xs text-muted-foreground">
        Developed By Switch2itech
      </div>
    </aside>
  );
}

/** Desktop sticky sidebar — hidden on small screens where the sheet is used. */
export default function Sidebar({ user }: { user: NavUser }) {
  return (
    <div className="sticky top-0 z-20 hidden h-screen shrink-0 md:block">
      <AppNav user={user} className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground" />
    </div>
  );
}
