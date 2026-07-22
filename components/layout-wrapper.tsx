'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/sidebar';

export default function LayoutWrapper({ 
  children, 
  user 
}: { 
  children: React.ReactNode;
  user: any;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isLoginPage = pathname?.startsWith('/login');

  if (isLoginPage) {
    return <>{children}</>;
  }

  // Prefer live session so sidebar role/menus stay correct after auth changes
  const activeUser = session?.user ?? user;

  return (
    <div className="flex">
      <Sidebar user={activeUser} />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
