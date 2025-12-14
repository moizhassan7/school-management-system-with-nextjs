'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useState } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
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
    BarChart3
} from 'lucide-react';

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
    const { schools } = useSidebar(); // Access hierarchy data
    const userRole = user.role || 'GUEST'; 
    
    // Toggle States
    const [isAcademicsExpanded, setIsAcademicsExpanded] = useState(false);
    const [isFinanceExpanded, setIsFinanceExpanded] = useState(false);
    const [expandedCampuses, setExpandedCampuses] = useState<Set<string>>(new Set());
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const toggle = (id: string, set: Set<string>, setFn: (s: Set<string>) => void) => {
        const newSet = new Set(set);
        newSet.has(id) ? newSet.delete(id) : newSet.add(id);
        setFn(newSet);
    };

    const isActive = (path: string) => pathname === path;
    const isPathActive = (path: string) => pathname.startsWith(path);

    // Permissions
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const isAccountant = userRole === 'ACCOUNTANT' || isSuperAdmin;

    const handleLogout = async () => {
        await signOut({ callbackUrl: '/login' });
    };

    // Helper for Nav Items
    const NavItem = ({ href, icon: Icon, label, active = false }: any) => (
        <Link 
            href={href} 
            className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
                ${active 
                    ? 'bg-primary text-white shadow-md shadow-primary/20' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }
            `}
        >
            <Icon className={`w-5 h-5 ${active ? 'fill-current' : ''}`} />
            <span className="text-sm font-medium">{label}</span>
        </Link>
    );

    return (
        <aside className="w-64 flex-shrink-0 bg-white dark:bg-[#1a2632] border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between z-20 transition-colors duration-200">
            
            {/* 1. Header / Branding */}
            <div className="p-6 pb-2">
                <div className="flex items-center gap-3 px-2 mb-6">
                    <div className="bg-primary/10 rounded-lg p-2 flex items-center justify-center text-primary">
                        <School className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-lg font-bold leading-tight text-slate-900 dark:text-white">EduManager</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-normal">Admin Portal</p>
                    </div>
                </div>

                {/* 2. Main Navigation */}
                <nav className="flex flex-col gap-1.5 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                    
                    <NavItem href="/" icon={LayoutDashboard} label="Dashboard" active={isActive('/')} />
                    
                    <NavItem href="/students" icon={GraduationCap} label="Students" active={isPathActive('/students')} />
                    
                    <NavItem href="/staff" icon={Users} label="Staff" active={isPathActive('/staff')} />

                    {/* Expandable: Finance */}
                    {isAccountant && (
                        <div>
                            <button 
                                onClick={() => setIsFinanceExpanded(!isFinanceExpanded)} 
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 ${isPathActive('/finance') ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}
                            >
                                <Banknote className="w-5 h-5" />
                                <span className="text-sm font-medium flex-1 text-left">Finance</span>
                                {isFinanceExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                            
                            {isFinanceExpanded && (
                                <div className="ml-4 pl-3 border-l border-slate-200 dark:border-slate-700 mt-1 space-y-1">
                                    <Link href="/finance/collect" className={`block px-3 py-2 rounded-md text-sm font-medium ${isActive('/finance/collect') ? 'text-primary bg-primary/5' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>
                                        Collect Fees
                                    </Link>
                                    <Link href="/finance/invoices" className={`block px-3 py-2 rounded-md text-sm font-medium ${isActive('/finance/invoices') ? 'text-primary bg-primary/5' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>
                                        Invoices
                                    </Link>
                                    <Link href="/finance/config" className={`block px-3 py-2 rounded-md text-sm font-medium ${isActive('/finance/config') ? 'text-primary bg-primary/5' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>
                                        Configuration
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Expandable: Academics Hierarchy */}
                    <div>
                        <button 
                            onClick={() => setIsAcademicsExpanded(!isAcademicsExpanded)} 
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <Layers className="w-5 h-5" />
                            <span className="text-sm font-medium flex-1 text-left">Academics</span>
                            {isAcademicsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>

                        {isAcademicsExpanded && (
                            <div className="ml-4 pl-3 border-l border-slate-200 dark:border-slate-700 mt-1 space-y-2">
                                {schools.map((school: any) => (
                                    <div key={school.id}>
                                        {/* School Name (Static or Link) */}
                                        <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 mt-2">
                                            {school.name}
                                        </div>
                                        
                                        {/* Campuses */}
                                        {school.campuses?.map((campus: any) => (
                                            <div key={campus.id} className="ml-1">
                                                <button 
                                                    onClick={() => toggle(campus.id, expandedCampuses, setExpandedCampuses)}
                                                    className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-sm text-slate-600 dark:text-slate-300"
                                                >
                                                    <Building2 className="w-3.5 h-3.5 opacity-70" />
                                                    <span className="truncate flex-1">{campus.name}</span>
                                                    {expandedCampuses.has(campus.id) ? <ChevronDown className="w-3 h-3"/> : <ChevronRight className="w-3 h-3"/>}
                                                </button>

                                                {/* Class Groups */}
                                                {expandedCampuses.has(campus.id) && (
                                                    <div className="ml-3 pl-2 border-l border-slate-200 dark:border-slate-700 mt-1 space-y-1">
                                                        {campus.classGroups?.map((group: any) => (
                                                            <div key={group.id}>
                                                                <button 
                                                                    onClick={() => toggle(group.id, expandedGroups, setExpandedGroups)}
                                                                    className="flex items-center gap-2 w-full text-left px-2 py-1 text-xs font-medium text-slate-500 hover:text-primary transition-colors"
                                                                >
                                                                    <span className="truncate">{group.name}</span>
                                                                </button>
                                                                
                                                                {/* Classes (Leaves) */}
                                                                {expandedGroups.has(group.id) && (
                                                                    <div className="ml-2 mt-1 space-y-0.5">
                                                                        {group.classes?.map((cls: any) => (
                                                                            <Link 
                                                                                key={cls.id} 
                                                                                href={`/academics/classes/${cls.id}`}
                                                                                className={`block px-2 py-1 text-[11px] rounded ${isActive(`/academics/classes/${cls.id}`) ? 'bg-primary/10 text-primary font-bold' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                                                                            >
                                                                                {cls.name}
                                                                            </Link>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <NavItem href="/schedule" icon={Calendar} label="Schedule" active={isPathActive('/schedule')} />

                    {/* Expandable: Exams */}
                    <div>
                        <button 
                            onClick={() => toggle('exams', new Set(), () => {})} 
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 ${isPathActive('/exams') ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}
                        >
                            <FileText className="w-5 h-5" />
                            <span className="text-sm font-medium flex-1 text-left">Exams</span>
                            {isPathActive('/exams') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        
                        {isPathActive('/exams') && (
                            <div className="ml-4 pl-3 border-l border-slate-200 dark:border-slate-700 mt-1 space-y-1">
                                <Link href="/exams/grading-systems" className={`block px-3 py-2 rounded-md text-sm font-medium ${isActive('/exams/grading-systems') ? 'text-primary bg-primary/5' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>
                                    <Award className="inline h-3 w-3 mr-2" />
                                    Grading Systems
                                </Link>
                                <Link href="/exams/configure" className={`block px-3 py-2 rounded-md text-sm font-medium ${isActive('/exams/configure') ? 'text-primary bg-primary/5' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>
                                    <ClipboardCheck className="inline h-3 w-3 mr-2" />
                                    Exam Configuration
                                </Link>
                                <Link href="/exams/marks-entry" className={`block px-3 py-2 rounded-md text-sm font-medium ${isActive('/exams/marks-entry') ? 'text-primary bg-primary/5' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>
                                    <BookOpen className="inline h-3 w-3 mr-2" />
                                    Marks Entry
                                </Link>
                                <Link href="/exams/class-tests" className={`block px-3 py-2 rounded-md text-sm font-medium ${isActive('/exams/class-tests') ? 'text-primary bg-primary/5' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>
                                    <FileText className="inline h-3 w-3 mr-2" />
                                    Class Tests
                                </Link>
                                <Link href="/exams/results/gazette" className={`block px-3 py-2 rounded-md text-sm font-medium ${isActive('/exams/results/gazette') ? 'text-primary bg-primary/5' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>
                                    <BarChart3 className="inline h-3 w-3 mr-2" />
                                    Results Gazette
                                </Link>
                                <Link href="/exams/results/report-card" className={`block px-3 py-2 rounded-md text-sm font-medium ${isActive('/exams/results/report-card') ? 'text-primary bg-primary/5' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>
                                    <FileText className="inline h-3 w-3 mr-2" />
                                    Report Cards
                                </Link>
                            </div>
                        )}
                    </div>
                </nav>
            </div>

            {/* 3. Footer / Bottom Actions */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                <Link 
                    href="/settings" 
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <Settings className="w-5 h-5" />
                    <span className="text-sm font-medium">Settings</span>
                </Link>
                
                <button 
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 transition-colors w-full text-left"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-medium">Logout</span>
                </button>
            </div>
        </aside>
    );
}