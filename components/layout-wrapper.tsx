'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Menu } from 'lucide-react';
import Sidebar, { AppNav, type NavUser } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useSchoolBrand } from '@/contexts/SchoolBrandContext';

export default function LayoutWrapper({
  children,
  user,
}: {
  children: React.ReactNode;
  user: NavUser;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { brand } = useSchoolBrand();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLoginPage = pathname?.startsWith('/login');

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  const activeUser = (session?.user ?? user) as NavUser;

  return (
    <div className="flex min-h-screen">
      <Sidebar user={activeUser} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur md:hidden">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <p className="truncate font-heading text-sm font-semibold text-foreground">{brand.name}</p>
            <p className="truncate text-xs text-muted-foreground">{activeUser.name || 'Menu'}</p>
          </div>
        </header>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[min(100%,18rem)] p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <AppNav user={activeUser} onNavigate={() => setMobileOpen(false)} className="flex h-full w-full flex-col bg-sidebar" />
          </SheetContent>
        </Sheet>

        <main className="page-shell min-w-0 bg-transparent">{children}</main>
      </div>
    </div>
  );
}
