'use client';

import { Search, Bell, MessageSquare } from 'lucide-react';

interface DashboardHeaderProps {
  user: {
    name: string;
    email: string;
    role?: string;
  };
}

export default function DashboardHeader({ user }: DashboardHeaderProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleDisplay = (role?: string) => {
    if (!role) return 'User';
    return role.replace('_', ' ');
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-[#1a2632] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold tracking-tight hidden sm:block text-slate-900 dark:text-white">
          Dashboard Overview
        </h2>
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
            <p className="text-sm font-semibold leading-none text-slate-900 dark:text-white">
              {user.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {getRoleDisplay(user.role)}
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border-2 border-white dark:border-slate-700 shadow-sm">
            {getInitials(user.name)}
          </div>
        </div>
      </div>
    </header>
  );
}

