"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { useSidebar } from "@/contexts/SidebarContext";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  Banknote,
  Calendar,
  Settings,
  LogOut,
  ChevronRight,
  ChevronDown,
  School,
  Building2,
  Layers,
  BookOpen,
  FileText,
  Award,
  ClipboardCheck,
  BarChart3,
  BookCopy,
  Network,
  Plus,
  CreditCard,
  FileSpreadsheet,
  FileBarChart,
  Home,
} from "lucide-react";

interface UserSession {
  name?: string | null;
  email?: string | null;
  role?: string;
  schoolId?: string;
}

interface SidebarProps {
  user: UserSession;
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const { schools } = useSidebar(); // Access the full hierarchy tree
  const userRole = user.role || "GUEST";

  // --- Toggle States ---
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(
    new Set()
  );
  const [expandedCampuses, setExpandedCampuses] = useState<Set<string>>(
    new Set()
  );
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Module States
  const [isFinanceExpanded, setIsFinanceExpanded] = useState(false);
  const [isExamsExpanded, setIsExamsExpanded] = useState(false);

  // --- Helpers ---
  const toggle = (
    id: string,
    set: Set<string>,
    setFn: (s: Set<string>) => void
  ) => {
    const newSet = new Set(set);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setFn(newSet);
  };

  const isActive = (path: string) => pathname === path;
  const isPathActive = (path: string) => pathname.startsWith(path);

  // --- Permissions ---
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isAdmin = userRole === "ADMIN" || isSuperAdmin;
  const isAccountant = userRole === "ACCOUNTANT" || isSuperAdmin;
  const isTeacher = userRole === "TEACHER" || isAdmin;
  const isStudent = userRole === "STUDENT";
  const isParent = userRole === "PARENT";
  const isStaff = userRole === "STAFF";

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <aside className="w-64 bg-white dark:bg-[#1a2632] border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen sticky top-0 z-20 transition-colors duration-200">
      {/* 1. Brand / Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xl tracking-tight">
          <GraduationCap className="w-6 h-6 text-primary" />
          <span>School System</span>
        </div>
        <div className="mt-1 text-xs font-semibold text-slate-500 uppercase tracking-widest">
          {userRole.replace("_", " ")} Portal
        </div>
      </div>

      {/* 2. Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
        {/* --- Core --- */}
        <Link
          href="/"
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isActive("/")
              ? "bg-primary text-white"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Home className="w-4 h-4" />
          Dashboard
        </Link>

        {/* Students menu - visible for admin and teachers */}
        {(isAdmin || isTeacher) && (
          <Link
            href="/students"
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isPathActive("/students")
                ? "bg-primary text-white"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            Students
          </Link>
        )}

        {/* Staff menu - visible for admin */}
        {isAdmin && (
          <Link
            href="/staff"
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isPathActive("/staff")
                ? "bg-primary text-white"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            Staff
          </Link>
        )}

        {/* Student-specific menu items */}
        {isStudent && (
          <>
            <Link
              href="/student/results"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isPathActive("/student/results")
                  ? "bg-primary text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Award className="w-4 h-4" />
              My Results
            </Link>
            <Link
              href="/student/attendance"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isPathActive("/student/attendance")
                  ? "bg-primary text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Calendar className="w-4 h-4" />
              My Attendance
            </Link>
            <Link
              href="/student/fees"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isPathActive("/student/fees")
                  ? "bg-primary text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Banknote className="w-4 h-4" />
              Fee Status
            </Link>
          </>
        )}

        {/* Parent-specific menu items */}
        {isParent && (
          <>
            <Link
              href="/portal/parent"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isPathActive("/portal/parent")
                  ? "bg-primary text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Users className="w-4 h-4" />
              My Children
            </Link>
            <Link
              href="/parent/fees"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isPathActive("/parent/fees")
                  ? "bg-primary text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Banknote className="w-4 h-4" />
              Fee Payments
            </Link>
          </>
        )}

        {/* Staff-specific menu items */}
        {isStaff && (
          <>
            <Link
              href="/staff/attendance"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isPathActive("/staff/attendance")
                  ? "bg-primary text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Calendar className="w-4 h-4" />
              My Attendance
            </Link>
            <Link
              href="/staff/leave"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isPathActive("/staff/leave")
                  ? "bg-primary text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <FileText className="w-4 h-4" />
              Leave Application
            </Link>
          </>
        )}

        {/* --- Finance Module --- */}
        {isAccountant && (
          <div>
            <button
              onClick={() => setIsFinanceExpanded(!isFinanceExpanded)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isPathActive("/finance")
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
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
              <div className="mt-1 ml-4 pl-3 border-l border-slate-200 dark:border-slate-700 space-y-1">
                <Link
                  href="/finance/invoices"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive("/finance/invoices")
                      ? "text-primary font-medium bg-primary/5"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Invoices
                </Link>
                <Link
                  href="/finance/collect"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive("/finance/collect")
                      ? "text-primary font-medium bg-primary/5"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" /> Collect Fees
                </Link>
                <Link
                  href="/finance/discounts"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive("/finance/discounts")
                      ? "text-primary font-medium bg-primary/5"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" /> Discounts
                </Link>
                <Link
                  href="/finance/config"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive("/finance/config")
                      ? "text-primary font-medium bg-primary/5"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" /> Configuration
                </Link>
                <Link href="/parents"  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive("/parents")
                      ? "text-primary font-medium bg-primary/5"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}>
                <Users className="w-4 h-4" />
                    Parents Module
                </Link>
                
              </div>
              
            )}
          </div>
        )}

        {/* --- Exams Module --- */}
        {isTeacher && (
          <div>
            <button
              onClick={() => setIsExamsExpanded(!isExamsExpanded)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isPathActive("/exams")
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
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
              <div className="mt-1 ml-4 pl-3 border-l border-slate-200 dark:border-slate-700 space-y-1">
                <Link
                  href="/exams/marks-entry"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive("/exams/marks-entry")
                      ? "text-primary font-medium bg-primary/5"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Marks Entry
                </Link>
                <Link
                  href="/exams/grading-systems"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive("/exams/grading-systems")
                      ? "text-primary font-medium bg-primary/5"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <Award className="w-3.5 h-3.5" /> Grading Rules
                </Link>
                {isAdmin && (
                  <Link
                    href="/exams/new"
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive("/exams/new")
                        ? "text-primary font-medium bg-primary/5"
                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" /> Create Exam
                  </Link>
                )}
                <Link
                  href="/exams/configure"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive("/exams/configure")
                      ? "text-primary font-medium bg-primary/5"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <ClipboardCheck className="w-3.5 h-3.5" /> Exam Setup
                </Link>
                <Link
                  href="/exams/results/report-card"
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive("/exams/results/report-card")
                      ? "text-primary font-medium bg-primary/5"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  <FileBarChart className="w-3.5 h-3.5" /> Report Cards
                </Link>
              </div>
            )}
          </div>
        )}

        {/* --- Hierarchy Tree (Admin) --- */}
        {isAdmin && (
          <div className="pt-4">
            <div className="px-3 pb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              Hierarchy
            </div>

            {/* Hierarchy Actions */}
            <Link
              href="/schools/new"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/schools/new")
                  ? "bg-primary text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Plus className="w-4 h-4" />
              Add School
            </Link>
            <Link
              href="/subject-groups"
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/subject-groups")
                  ? "bg-primary text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Layers className="w-4 h-4" />
              Subject Groups
            </Link>

            {/* --- Dynamic Tree: School -> Campus -> Group -> Class --- */}
            <div className="mt-2 space-y-2">
              {schools.map((school: any) => {
                const isSchoolExpanded = expandedSchools.has(school.id);
                return (
                  <div key={school.id}>
                    {/* School Node */}
                    <div className="flex items-center gap-1 group">
                      <button
                        onClick={() =>
                          toggle(school.id, expandedSchools, setExpandedSchools)
                        }
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400"
                      >
                        {isSchoolExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <Link
                        href={`/schools/${school.id}/campuses`}
                        className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <School className="w-3.5 h-3.5 text-blue-500" />
                        <span className="truncate font-medium">
                          {school.name}
                        </span>
                      </Link>
                    </div>

                    {/* Campus List */}
                    {isSchoolExpanded && (
                      <div className="ml-2 pl-3 border-l border-slate-200 dark:border-slate-700 mt-1 space-y-1">
                        {school.campuses?.map((campus: any) => {
                          const isCampusExpanded = expandedCampuses.has(
                            campus.id
                          );
                          return (
                            <div key={campus.id}>
                              <div className="flex items-center gap-1 group">
                                <button
                                  onClick={() =>
                                    toggle(
                                      campus.id,
                                      expandedCampuses,
                                      setExpandedCampuses
                                    )
                                  }
                                  className={`p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 ${
                                    !campus.classGroups?.length
                                      ? "opacity-30 pointer-events-none"
                                      : ""
                                  }`}
                                >
                                  {isCampusExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <Link
                                  href={`/schools/${school.id}/campuses/${campus.id}`}
                                  className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                  <Building2 className="w-3.5 h-3.5 text-green-500" />
                                  <span className="truncate">
                                    {campus.name}
                                  </span>
                                </Link>
                              </div>

                              {/* Class Groups List */}
                              {isCampusExpanded && (
                                <div className="ml-2 pl-3 border-l border-slate-200 dark:border-slate-700 mt-1 space-y-1">
                                  {campus.classGroups?.map((group: any) => {
                                    const isGroupExpanded = expandedGroups.has(
                                      group.id
                                    );
                                    return (
                                      <div key={group.id}>
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() =>
                                              toggle(
                                                group.id,
                                                expandedGroups,
                                                setExpandedGroups
                                              )
                                            }
                                            className={`p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 ${
                                              !group.classes?.length
                                                ? "opacity-30 pointer-events-none"
                                                : ""
                                            }`}
                                          >
                                            {isGroupExpanded ? (
                                              <ChevronDown className="w-3.5 h-3.5" />
                                            ) : (
                                              <ChevronRight className="w-3.5 h-3.5" />
                                            )}
                                          </button>
                                          <Link
                                            href={`/class-groups/${group.id}`}
                                            className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                          >
                                            <Layers className="w-3.5 h-3.5 text-orange-400" />
                                            <span className="truncate">
                                              {group.name}
                                            </span>
                                          </Link>
                                        </div>

                                        {/* Classes List */}
                                        {isGroupExpanded && (
                                          <div className="ml-2 pl-3 border-l border-slate-200 dark:border-slate-700 mt-1 space-y-0.5">
                                            {group.classes?.map((cls: any) => (
                                              <Link
                                                key={cls.id}
                                                href={`/classes/${cls.id}`}
                                                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors ${
                                                  isActive(`/classes/${cls.id}`)
                                                    ? "text-primary font-medium bg-primary/5"
                                                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                                                }`}
                                              >
                                                <BookOpen className="w-3 h-3 text-indigo-400 opacity-70" />
                                                <span className="truncate">
                                                  {cls.name}
                                                </span>
                                              </Link>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* 3. Footer / Profile */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-800">
            {user.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate text-slate-700 dark:text-slate-200">
              {user.name || "User"}
            </p>
            <p
              className="text-xs text-slate-500 truncate"
              title={user.email || ""}
            >
              {user.email || "No Email"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-md transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="text-center text-xs text-slate-500 dark:text-slate-400 py-2 border-t border-slate-200 dark:border-slate-800">
        Developed By Moiz Hassan
      </div>
    </aside>
  );
}
