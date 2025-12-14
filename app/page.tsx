'use client';

import { 
    Users, 
    UserCheck, 
    Wallet, 
    UserPlus, 
    Search, 
    Bell, 
    MessageSquare, 
    TrendingUp, 
    MoreHorizontal,
    CalendarCheck,
    CreditCard,
    Megaphone,
    FileText,
    MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function Dashboard() {
    return (
        <div className="flex flex-col h-full bg-[#f6f7f8] dark:bg-[#101922]">
            
            {/* Top Header */}
            <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-[#1a2632] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold tracking-tight hidden sm:block text-slate-900 dark:text-white">Dashboard Overview</h2>
                </div>
                
                <div className="flex items-center gap-4 sm:gap-6">
                    {/* Search */}
                    <div className="relative hidden sm:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <input 
                            className="w-64 pl-10 pr-4 py-2 bg-[#f6f7f8] dark:bg-[#101922] border-none rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/50 placeholder:text-slate-400 outline-none transition-all" 
                            placeholder="Search students, staff..." 
                            type="text"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <button className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white dark:border-[#1a2632]"></span>
                        </button>
                        <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
                            <MessageSquare className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Profile */}
                    <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-700">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-semibold leading-none text-slate-900 dark:text-white">Admin User</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Super Admin</p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border-2 border-white dark:border-slate-700 shadow-sm">
                            AD
                        </div>
                    </div>
                </div>
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
                
                {/* KPI Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Stat 1 */}
                    <div className="bg-white dark:bg-[#1a2632] p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-primary">
                                <Users className="h-6 w-6" />
                            </div>
                            <span className="text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" /> +5%
                            </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Students</p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">1,250</h3>
                    </div>

                    {/* Stat 2 */}
                    <div className="bg-white dark:bg-[#1a2632] p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
                                <UserCheck className="h-6 w-6" />
                            </div>
                            <span className="text-slate-500 text-xs font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Today</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Staff Present</p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">42<span className="text-slate-400 text-lg font-normal">/45</span></h3>
                    </div>

                    {/* Stat 3 */}
                    <div className="bg-white dark:bg-[#1a2632] p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600">
                                <Wallet className="h-6 w-6" />
                            </div>
                            <span className="text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded text-xs font-semibold">Overdue</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Unpaid Fees</p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">$12,400</h3>
                    </div>

                    {/* Stat 4 */}
                    <div className="bg-white dark:bg-[#1a2632] p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg text-teal-600">
                                <UserPlus className="h-6 w-6" />
                            </div>
                            <span className="text-slate-500 text-xs font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">Pending</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">New Enquiries</p>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">8</h3>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Chart Section (2/3 width) */}
                    <div className="lg:col-span-2 bg-white dark:bg-[#1a2632] rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Weekly Attendance</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">Average attendance across all grades</p>
                            </div>
                            <div className="flex items-center gap-2 text-sm bg-[#f6f7f8] dark:bg-background-dark p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                <button className="px-3 py-1 bg-white dark:bg-slate-700 shadow-sm rounded-md text-slate-900 dark:text-white font-medium text-xs">Students</button>
                                <button className="px-3 py-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium text-xs">Staff</button>
                            </div>
                        </div>
                        
                        {/* Chart Visualization (SVG) */}
                        <div className="relative w-full h-64">
                            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 300">
                                <defs>
                                    <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="#137fec" stopOpacity="0.2"></stop>
                                        <stop offset="100%" stopColor="#137fec" stopOpacity="0"></stop>
                                    </linearGradient>
                                </defs>
                                {/* Grid Lines */}
                                <line stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="800" y1="250" y2="250" className="dark:stroke-slate-700"></line>
                                <line stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="800" y1="175" y2="175" className="dark:stroke-slate-700"></line>
                                <line stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="800" y1="100" y2="100" className="dark:stroke-slate-700"></line>
                                {/* The Path */}
                                <path d="M0,220 C100,220 100,120 200,140 C300,160 300,100 400,80 C500,60 500,180 600,150 C700,120 700,50 800,50 V250 H0 Z" fill="url(#chartGradient)"></path>
                                <path d="M0,220 C100,220 100,120 200,140 C300,160 300,100 400,80 C500,60 500,180 600,150 C700,120 700,50 800,50" fill="none" stroke="#137fec" strokeLinecap="round" strokeWidth="3"></path>
                                {/* Data Points */}
                                <circle cx="200" cy="140" r="4" className="fill-white stroke-primary stroke-2"></circle>
                                <circle cx="400" cy="80" r="4" className="fill-white stroke-primary stroke-2"></circle>
                                <circle cx="600" cy="150" r="4" className="fill-white stroke-primary stroke-2"></circle>
                            </svg>
                        </div>
                        <div className="flex justify-between px-2 mt-4 text-xs text-slate-400 font-medium">
                            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span>
                        </div>
                    </div>

                    {/* Notice Board (1/3 width) */}
                    <div className="bg-white dark:bg-[#1a2632] rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Notice Board</h3>
                            <button className="text-primary text-sm font-medium hover:underline">View All</button>
                        </div>
                        <div className="p-4 flex flex-col gap-4 flex-1">
                            {/* Notice Item 1 */}
                            <div className="flex gap-4 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/10 border-l-4 border-orange-400">
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-orange-600 uppercase mb-1">Important</p>
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Staff Meeting</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">Mandatory meeting for all teaching staff this Friday regarding new curriculum.</p>
                                    <p className="text-xs text-slate-400 mt-2 font-medium">Fri, 3:00 PM</p>
                                </div>
                            </div>
                            {/* Notice Item 2 */}
                            <div className="flex gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all">
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-primary uppercase mb-1">Holiday</p>
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">School Closed</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Next Tuesday declared holiday due to local elections.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Section: Quick Actions & Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6">
                    {/* Quick Actions (Left) */}
                    <div className="lg:col-span-8 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Quick Actions</h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <button className="flex flex-col items-center justify-center p-6 bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-slate-800 rounded-lg hover:border-primary hover:shadow-md transition-all group">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors mb-3">
                                    <UserPlus className="h-6 w-6" />
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Add Student</span>
                            </button>
                            <button className="flex flex-col items-center justify-center p-6 bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-slate-800 rounded-lg hover:border-primary hover:shadow-md transition-all group">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors mb-3">
                                    <Megaphone className="h-6 w-6" />
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Announce</span>
                            </button>
                            <button className="flex flex-col items-center justify-center p-6 bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-slate-800 rounded-lg hover:border-primary hover:shadow-md transition-all group">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors mb-3">
                                    <FileText className="h-6 w-6" />
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Fee Report</span>
                            </button>
                            <button className="flex flex-col items-center justify-center p-6 bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-slate-800 rounded-lg hover:border-primary hover:shadow-md transition-all group">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors mb-3">
                                    <MessageCircle className="h-6 w-6" />
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Send SMS</span>
                            </button>
                        </div>
                    </div>

                    {/* Recent Activity (Right) */}
                    <div className="lg:col-span-4 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Activity</h3>
                        </div>
                        <div className="bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                            <div className="space-y-4">
                                <div className="flex gap-3 items-start">
                                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 flex-shrink-0 mt-0.5">
                                        <CreditCard className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-700 dark:text-slate-200"><span className="font-semibold">John Doe</span> paid tuition fees.</p>
                                        <p className="text-xs text-slate-400 mt-1">2 mins ago</p>
                                    </div>
                                </div>
                                <div className="w-full h-px bg-slate-100 dark:bg-slate-700"></div>
                                <div className="flex gap-3 items-start">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5">
                                        <CalendarCheck className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-700 dark:text-slate-200"><span className="font-semibold">Admin</span> updated Grade 5 schedule.</p>
                                        <p className="text-xs text-slate-400 mt-1">1 hour ago</p>
                                    </div>
                                </div>
                                <div className="w-full h-px bg-slate-100 dark:bg-slate-700"></div>
                                <div className="flex gap-3 items-start">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 flex-shrink-0 mt-0.5">
                                        <UserPlus className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-700 dark:text-slate-200">New student <span className="font-semibold">Sarah Smith</span> enrolled.</p>
                                        <p className="text-xs text-slate-400 mt-1">3 hours ago</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}