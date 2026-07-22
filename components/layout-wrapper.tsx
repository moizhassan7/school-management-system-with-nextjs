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

  const activeUser = session?.user ?? user;

  return (
    <div className="flex min-h-screen">
      <Sidebar user={activeUser} />
      <main className="page-shell min-w-0 bg-transparent">
        {children}
      </main>
    </div>
  );
}
