"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
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
  Award,
  ClipboardCheck,
  CreditCard,
  FileSpreadsheet,
  FileBarChart,
  Home,
  Shield,
  Plus,
} from "lucide-react";
import { can } from "@/lib/permissions";
import { useSchoolBrand } from "@/contexts/SchoolBrandContext";

interface UserSession {
  name?: string | null;
  email?: string | null;
  role?: string;
  schoolId?: string;
  permissions?: string[];
  campusIds?: string[];
}

interface SidebarProps {
  user: UserSession;
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const { brand } = useSchoolBrand();
  const userRole = user.role || "GUEST";

  // Module States
  const [isFinanceExpanded, setIsFinanceExpanded] = useState(false);
  const [isExamsExpanded, setIsExamsExpanded] = useState(false);

  const isActive = (path: string) => pathname === path;
  const isPathActive = (path: string) => pathname.startsWith(path);

  // --- Permissions (module-based; SUPER_ADMIN bypass inside can()) ---
  const canDashboard = can(user, "DASHBOARD", "VIEW");
  const canStudents = can(user, "STUDENTS", "VIEW");
  const canTeachers = can(user, "TEACHERS", "VIEW");
  const canFees = can(user, "FEES", "VIEW");
  const canExams = can(user, "EXAMS", "VIEW");
  const canAttendance = can(user, "ATTENDANCE", "VIEW");
  const canConfig = can(user, "CONFIGURATION", "VIEW");
  const canUsers = can(user, "USERS", "VIEW");
  const isStudent = userRole === "STUDENT";
  const isParent = userRole === "PARENT";
  const isStaff = userRole === "STAFF";

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const linkClass = (active: boolean) =>
    `flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-200 ${
      active
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    }`;

  const subLinkClass = (active: boolean) =>
    `flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
      active
        ? "bg-primary/10 font-medium text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  return (
    <aside className="sticky top-0 z-20 flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-colors duration-200">
      {/* 1. Brand / Header */}
      <div className="border-b border-sidebar-border p-5">
        <div className="flex items-center gap-3 font-heading text-lg font-semibold tracking-tight text-foreground">
          <Image
            src={brand.logoPath || "/logo/logo.png"}
            alt={`${brand.name} Logo`}
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
            priority
            unoptimized={brand.logoPath?.startsWith("/uploads/")}
          />
          <span className="truncate">{brand.name}</span>
        </div>
        <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {userRole.replace("_", " ")} Portal
        </div>
      </div>

      {/* 2. Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        {/* --- Core --- */}
        {canDashboard && (
        <Link href="/" className={linkClass(isActive("/"))}>
          <Home className="w-4 h-4" />
          Dashboard
        </Link>
        )}

        {canStudents && (
          <Link href="/students" className={linkClass(isPathActive("/students"))}>
            <Users className="w-4 h-4" />
            Students
          </Link>
        )}

        {canTeachers && (
          <Link href="/staff" className={linkClass(isPathActive("/staff"))}>
            <Users className="w-4 h-4" />
            Staff
          </Link>
        )}

        {canAttendance && !isStaff && (
          <Link href="/attendance" className={linkClass(isPathActive("/attendance"))}>
            <Calendar className="w-4 h-4" />
            Attendance
          </Link>
        )}

        {isStudent && (
          <>
            <Link href="/student/results" className={linkClass(isPathActive("/student/results"))}>
              <Award className="w-4 h-4" />
              My Results
            </Link>
            <Link href="/student/attendance" className={linkClass(isPathActive("/student/attendance"))}>
              <Calendar className="w-4 h-4" />
              My Attendance
            </Link>
            <Link href="/student/fees" className={linkClass(isPathActive("/student/fees"))}>
              <Banknote className="w-4 h-4" />
              Fee Status
            </Link>
          </>
        )}

        {isParent && (
          <>
            <Link href="/portal/parent" className={linkClass(isPathActive("/portal/parent"))}>
              <Users className="w-4 h-4" />
              My Children
            </Link>
            <Link href="/parent/fees" className={linkClass(isPathActive("/parent/fees"))}>
              <Banknote className="w-4 h-4" />
              Fee Payments
            </Link>
          </>
        )}

        {isStaff && (
          <>
            <Link href="/staff/attendance" className={linkClass(isPathActive("/staff/attendance"))}>
              <Calendar className="w-4 h-4" />
              My Attendance
            </Link>
            <Link href="/staff/leave" className={linkClass(isPathActive("/staff/leave"))}>
              <FileText className="w-4 h-4" />
              Leave Application
            </Link>
          </>
        )}

        {/* --- Finance Module --- */}
        {canFees && (
          <div>
            <button
              onClick={() => setIsFinanceExpanded(!isFinanceExpanded)}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                isPathActive("/finance")
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Banknote className="w-4 h-4" />
              <span className="flex-1 text-left">Finance</span>
              {isFinanceExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>

            {isFinanceExpanded && (
              <div className="mt-1 ml-4 space-y-1 border-l border-border pl-3">
                <Link href="/finance/invoices" className={subLinkClass(isActive("/finance/invoices"))}>
                  <FileText className="w-3.5 h-3.5" /> Invoices
                </Link>
                <Link href="/finance/collect" className={subLinkClass(isActive("/finance/collect"))}>
                  <CreditCard className="w-3.5 h-3.5" /> Collect Fees
                </Link>
                <Link href="/finance/discounts" className={subLinkClass(isActive("/finance/discounts"))}>
                  <Banknote className="w-3.5 h-3.5" /> Discounts
                </Link>
                <Link href="/finance/config" className={subLinkClass(isActive("/finance/config"))}>
                  <Settings className="w-3.5 h-3.5" /> Configuration
                </Link>
                <Link href="/parents" className={subLinkClass(isActive("/parents"))}>
                  <Users className="w-3.5 h-3.5" /> Parents Module
                </Link>
              </div>
            )}
          </div>
        )}

        {/* --- Exams Module --- */}
        {canExams && (
          <div>
            <button
              onClick={() => setIsExamsExpanded(!isExamsExpanded)}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                isPathActive("/exams")
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span className="flex-1 text-left">Academics & Exams</span>
              {isExamsExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>

            {isExamsExpanded && (
              <div className="mt-1 ml-4 space-y-1 border-l border-border pl-3">
                <Link href="/exams/marks-entry" className={subLinkClass(isActive("/exams/marks-entry"))}>
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Marks Entry
                </Link>
                <Link href="/exams/grading-systems" className={subLinkClass(isActive("/exams/grading-systems"))}>
                  <Award className="w-3.5 h-3.5" /> Grading Rules
                </Link>
                {can(user, "EXAMS", "CREATE") && (
                  <Link href="/exams/new" className={subLinkClass(isActive("/exams/new"))}>
                    <Plus className="w-3.5 h-3.5" /> Create Exam
                  </Link>
                )}
                <Link href="/exams/configure" className={subLinkClass(isActive("/exams/configure"))}>
                  <ClipboardCheck className="w-3.5 h-3.5" /> Exam Setup
                </Link>
                <Link href="/exams/results/report-card" className={subLinkClass(isActive("/exams/results/report-card"))}>
                  <FileBarChart className="w-3.5 h-3.5" /> Report Cards
                </Link>
              </div>
            )}
          </div>
        )}

        {/* --- Administration --- */}
        {(canUsers || canConfig) && (
          <div className="pt-4">
            <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Administration
            </div>
            {canUsers && (
              <Link href="/users" className={linkClass(isPathActive("/users"))}>
                <Shield className="w-4 h-4" />
                User Management
              </Link>
            )}
            {canConfig && (
              <Link
                href="/configuration"
                className={linkClass(isPathActive("/configuration") || isPathActive("/subject-groups"))}
              >
                <Settings className="w-4 h-4" />
                Configuration
              </Link>
            )}
          </div>
        )}
      </nav>

      {/* 3. Footer / Profile */}
      <div className="border-t border-sidebar-border bg-muted/40 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-sm ring-2 ring-card">
            {user.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-foreground">
              {user.name || "User"}
            </p>
            <p
              className="truncate text-xs text-muted-foreground"
              title={user.email || ""}
            >
              {user.email || "No Email"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="cursor-pointer rounded-xl p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Sign Out"
            type="button"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="border-t border-sidebar-border py-2 text-center text-xs text-muted-foreground">
        Developed By Switch2itech
      </div>
    </aside>
  );
}
