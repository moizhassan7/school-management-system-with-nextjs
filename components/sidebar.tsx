'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { 
    School, 
    Building2, 
    Home, 
    Plus, 
    ChevronDown, 
    ChevronRight, 
    Users, 
    BookOpen, 
    Layers, 
    GraduationCap,
    FileText,
    CreditCard,
    Settings,
    Banknote,
    FileSpreadsheet,
    FileBarChart,
    LogOut // Import LogOut Icon
} from 'lucide-react';
import { useState } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';

// Define the User interface
interface UserSession {
    name?: string | null;
    email?: string | null;
    role?: string;
    schoolId?: string;
}

interface SidebarProps {
    user: UserSession; // Accept full user object
}

export default function Sidebar({ user }: SidebarProps) {
    const pathname = usePathname();
    const { data } = useSession();
    const effectiveUser = (data?.user as UserSession | undefined) ?? user;
    const { schools, classGroups } = useSidebar();
    const userRole = effectiveUser.role || 'GUEST';
    
    // Toggle States
    const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set());
    const [expandedCampuses, setExpandedCampuses] = useState<Set<string>>(new Set());
    const [expandedClassGroups, setExpandedClassGroups] = useState<Set<string>>(new Set());
    const [expandedSubjectGroups, setExpandedSubjectGroups] = useState<Set<string>>(new Set());
    
    // Module Expansion States
    const [isFinanceExpanded, setIsFinanceExpanded] = useState(false);
    const [isAcademicsExpanded, setIsAcademicsExpanded] = useState(false);

    // Helpers
    const toggle = (id: string, set: Set<string>, setFn: (s: Set<string>) => void) => {
        const newSet = new Set(set);
        newSet.has(id) ? newSet.delete(id) : newSet.add(id);
        setFn(newSet);
    };

    const isActive = (path: string) => pathname === path;
    const isPathActive = (path: string) => pathname.startsWith(path);

    // Role Checks
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const isAdmin = userRole === 'ADMIN' || isSuperAdmin;
    const isAccountant = userRole === 'ACCOUNTANT' || isSuperAdmin;
    const isTeacher = userRole === 'TEACHER' || isAdmin; 

    return (
        <div className="w-64 bg-gray-900 min-h-screen text-white flex flex-col border-r border-gray-800">
            {/* Brand */}
            <div className="p-6 border-b border-gray-800">
                <h1 className="text-xl font-bold flex items-center gap-2 tracking-tight">
                    <GraduationCap className="w-6 h-6 text-indigo-500" />
                    EduManager
                </h1>
                <div className="mt-2 text-xs text-gray-500 uppercase tracking-widest font-semibold">
                    {userRole.replace('_', ' ')}
                </div>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
                <ul className="space-y-1">
                    
                    {/* 1. Dashboard (Everyone) */}
                    <li>
                        <Link href="/" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all ${isActive('/') ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                            <Home className="w-4 h-4" />
                            <span className="text-sm font-medium">Dashboard</span>
                        </Link>
                    </li>

                    {/* 2. Student Management (Admins & Teachers) */}
                    {isTeacher && (
                        <li>
                            <Link href="/students" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all ${isActive('/students') ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                                <Users className="w-4 h-4" />
                                <span className="text-sm font-medium">Students</span>
                            </Link>
                        </li>
                    )}

                    {/* 3. Finance Module (Accountant & Super Admin) */}
                    {isAccountant && (
                        <li>
                            <button onClick={() => setIsFinanceExpanded(!isFinanceExpanded)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${isPathActive('/finance') ? 'text-white bg-gray-800' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                                <Banknote className="w-4 h-4" />
                                <span className="text-sm font-medium flex-1 text-left">Finance</span>
                                {isFinanceExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                            {isFinanceExpanded && (
                                <ul className="pl-4 space-y-1 mt-1">
                                    <li>
                                        <Link href="/finance/invoices" className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${isActive('/finance/invoices') ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                                            <FileText className="w-3.5 h-3.5" /> <span>Invoices</span>
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/finance/collect" className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${isActive('/finance/collect') ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                                            <CreditCard className="w-3.5 h-3.5" /> <span>Collect Fees</span>
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/finance/discounts" className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${isActive('/finance/discounts') ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                                            <Banknote className="w-3.5 h-3.5" /> <span>Discounts</span>
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/finance/config" className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${isActive('/finance/config') ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                                            <Settings className="w-3.5 h-3.5" /> <span>Configuration</span>
                                        </Link>
                                    </li>
                                </ul>
                            )}
                        </li>
                    )}

                    {/* 4. Academics / Exams (Teachers & Admins) */}
                    {isTeacher && (
                        <li>
                            <button onClick={() => setIsAcademicsExpanded(!isAcademicsExpanded)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${isPathActive('/academics') ? 'text-white bg-gray-800' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                                <BookOpen className="w-4 h-4" />
                                <span className="text-sm font-medium flex-1 text-left">Academics</span>
                                {isAcademicsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                            {isAcademicsExpanded && (
                                <ul className="pl-4 space-y-1 mt-1">
                                    <li>
                                        <Link href="/academics/exams" className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${isActive('/academics/exams') ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                                            <FileSpreadsheet className="w-3.5 h-3.5" /> <span>Exams</span>
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/academics/grading" className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${isActive('/academics/grading') ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                                            <Settings className="w-3.5 h-3.5" /> <span>Grading Rules</span>
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/academics/reports" className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${isActive('/academics/reports') ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                                            <FileBarChart className="w-3.5 h-3.5" /> <span>Reports</span>
                                        </Link>
                                    </li>
                                </ul>
                            )}
                        </li>
                    )}

                    {/* 5. User Management (Admin Only) */}
                    {isAdmin && (
                        <li>
                            <Link href="/users" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all ${isActive('/users') ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                                <Users className="w-4 h-4" />
                                <span className="text-sm font-medium">All Users</span>
                            </Link>
                        </li>
                    )}

                    {/* 6. Organization Hierarchy (Admin Only) */}
                    {isAdmin && (
                        <>
                            <li className="pt-4 pb-2">
                                <div className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Hierarchy
                                </div>
                            </li>
                            <li>
                                <Link href="/schools/new" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all ${isActive('/schools/new') ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                                    <Plus className="w-4 h-4" />
                                    <span className="text-sm font-medium">Add School</span>
                                </Link>
                            </li>
                            {/* Render Schools Loop Here */}
                            {schools.map((school) => {
                                const isSchoolExpanded = expandedSchools.has(school.id);
                                return (
                                    <li key={school.id} className="space-y-1">
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => toggle(school.id, expandedSchools, setExpandedSchools)} className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white">
                                                {isSchoolExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                            </button>
                                            <Link href={`/schools/${school.id}/campuses`} className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-800 text-gray-300 hover:text-white text-sm">
                                                <School className="w-4 h-4 text-blue-400" />
                                                <span className="truncate">{school.name}</span>
                                            </Link>
                                        </div>
                                        {/* Nested Logic for Campuses -> Class Groups -> Subject Groups -> Classes */}
                                        {isSchoolExpanded && (
                                            <ul className="pl-4 space-y-1 border-l border-gray-800 ml-2.5">
                                                {school.campuses.map((campus) => {
                                                    const isCampusExpanded = expandedCampuses.has(campus.id);
                                                    const campusClassGroups = classGroups.filter(cg => cg.campusId === campus.id);
                                                    return (
                                                        <li key={campus.id}>
                                                            <div className="flex items-center gap-1">
                                                                <button onClick={() => toggle(campus.id, expandedCampuses, setExpandedCampuses)} className={`p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white ${campusClassGroups.length === 0 ? 'opacity-0 pointer-events-none' : ''}`}>
                                                                    {isCampusExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                                </button>
                                                                <Link href={`/schools/${school.id}/campuses/${campus.id}`} className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white text-sm">
                                                                    <Building2 className="w-3.5 h-3.5 text-green-400" />
                                                                    <span className="truncate">{campus.name}</span>
                                                                </Link>
                                                            </div>
                                                            {isCampusExpanded && (
                                                                <ul className="pl-4 space-y-1 border-l border-gray-800 ml-2.5">
                                                                    {campusClassGroups.map(cg => (
                                                                        <li key={cg.id}>
                                                                            <Link href={`/class-groups/${cg.id}`} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white text-sm">
                                                                                <Users className="w-3.5 h-3.5 text-yellow-400" />
                                                                                <span className="truncate">{cg.name}</span>
                                                                            </Link>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </li>
                                );
                            })}
                        </>
                    )}
                </ul>
            </nav>

            {/* User Profile / Footer */}
            <div className="p-4 border-t border-gray-800 bg-gray-900/50">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-inner">
                        {effectiveUser.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium truncate text-gray-200">{effectiveUser.name || 'User'}</p>
                        <p className="text-xs text-gray-500 truncate" title={effectiveUser.email || ''}>{effectiveUser.email || 'No Email'}</p>
                    </div>
                    <button 
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-md transition-colors text-gray-400"
                        title="Sign Out"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
