'use client';

import { Search, Bell, MessageSquare } from 'lucide-react';
import { useSchoolBrand } from '@/contexts/SchoolBrandContext';

interface DashboardHeaderProps {
  user: {
    name: string;
    email: string;
    role?: string;
  };
}

export default function DashboardHeader({ user }: DashboardHeaderProps) {
  const { brand } = useSchoolBrand();
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
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border/80 bg-card/90 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4">
      <div className="flex items-center gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {brand.name}
          </p>
          <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Dashboard Overview
          </h2>
        </div>
      </div>
      
      <div className="flex items-center gap-3 sm:gap-5">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input 
            className="w-64 rounded-xl border border-border/80 bg-muted/60 py-2 pl-10 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20" 
            placeholder="Search students, staff..." 
            type="text"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="relative cursor-pointer rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-card bg-destructive" />
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Messages"
          >
            <MessageSquare className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-3 border-l border-border/80 pl-3 sm:pl-4">
          <div className="hidden text-right md:block">
            <p className="text-sm font-semibold leading-none text-foreground">
              {user.name}
            </p>
            <p className="mt-1 text-xs capitalize text-muted-foreground">
              {getRoleDisplay(user.role)}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-card bg-primary/15 font-heading text-sm font-bold text-primary shadow-sm">
            {getInitials(user.name)}
          </div>
        </div>
      </div>
    </header>
  );
}
