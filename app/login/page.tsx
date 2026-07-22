'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { authenticate } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GraduationCap } from 'lucide-react';
import Image from 'next/image';
import { useSchoolBrand } from '@/contexts/SchoolBrandContext';

export default function LoginPage() {
  const [errorMessage, dispatch] = useFormState(authenticate, undefined);
  const { brand } = useSchoolBrand();

  useEffect(() => {
    if (errorMessage === 'SUCCESS') {
      window.location.assign('/');
    }
  }, [errorMessage]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 10% 20%, rgba(13,148,136,0.22), transparent), radial-gradient(ellipse 50% 40% at 90% 10%, rgba(217,119,6,0.14), transparent), linear-gradient(160deg, #f0fdfa 0%, #e8f1f4 45%, #fef3c7 100%)',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
            <Image
              src={brand.logoPath || '/logo/logo.png'}
              alt={brand.name}
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
              priority
              unoptimized={brand.logoPath?.startsWith('/uploads/')}
            />
          </div>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            {brand.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to the school management portal
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card/95 p-6 shadow-xl backdrop-blur-sm sm:p-8">
          <div className="mb-6 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <GraduationCap className="h-4 w-4 text-primary" />
            Staff & admin access
          </div>

          <form action={dispatch} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Email or Username
              </label>
              <Input
                type="text"
                name="email"
                placeholder="admin@school.com or username"
                required
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Password
              </label>
              <Input
                type="password"
                name="password"
                placeholder="••••••••"
                required
                className="rounded-xl"
              />
            </div>
            <LoginButton />
            {errorMessage && errorMessage !== 'SUCCESS' && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-center text-sm text-destructive">
                {errorMessage}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

function LoginButton() {
  const { pending } = useFormStatus();
  return (
    <Button className="mt-2 w-full cursor-pointer rounded-xl" disabled={pending}>
      {pending ? 'Signing in...' : 'Sign In'}
    </Button>
  );
}
