'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/sidebar';

export default function LayoutWrapper({ 
  children, 
  user 
}: { 
  children: React.ReactNode;
  user: any;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname?.startsWith('/login');

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex">
      <Sidebar user={user} />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
