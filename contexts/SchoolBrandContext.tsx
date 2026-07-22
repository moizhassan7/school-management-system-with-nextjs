'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useSession } from 'next-auth/react';

export interface SchoolBrand {
  id: string | null;
  name: string;
  initials: string;
  logoPath: string;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
}

const DEFAULT_BRAND: SchoolBrand = {
  id: null,
  name: 'School Management',
  initials: 'SMS',
  logoPath: '/logo/logo.png',
  address: null,
  email: null,
  phone: null,
};

interface SchoolBrandContextType {
  brand: SchoolBrand;
  isLoading: boolean;
  refreshBrand: () => Promise<void>;
}

const SchoolBrandContext = createContext<SchoolBrandContextType | undefined>(
  undefined
);

export function SchoolBrandProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [brand, setBrand] = useState<SchoolBrand>(DEFAULT_BRAND);
  const [isLoading, setIsLoading] = useState(true);

  const refreshBrand = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/branding', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setBrand({
          id: data.id ?? null,
          name: data.name || DEFAULT_BRAND.name,
          initials: data.initials || DEFAULT_BRAND.initials,
          logoPath: data.logoPath || DEFAULT_BRAND.logoPath,
          address: data.address ?? null,
          email: data.email ?? null,
          phone: data.phone ?? null,
        });
      }
    } catch (error) {
      console.error('Failed to load school branding:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    refreshBrand();
  }, [refreshBrand, status, session?.user?.schoolId]);

  return (
    <SchoolBrandContext.Provider value={{ brand, isLoading, refreshBrand }}>
      {children}
    </SchoolBrandContext.Provider>
  );
}

export function useSchoolBrand() {
  const context = useContext(SchoolBrandContext);
  if (context === undefined) {
    throw new Error('useSchoolBrand must be used within a SchoolBrandProvider');
  }
  return context;
}
