'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../../../lib/hooks';
import { SalesSidebar } from '../../../components/sales/SalesSidebar';
import { Toaster } from '../../../components/ui/toaster';

export default function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [navReady, setNavReady] = React.useState(false);

  React.useEffect(() => {
    if (!loading) {
      if (!user || (user.role !== 'sales' && user.role !== 'manager' && user.role !== 'admin')) {
        router.replace('/');
        return;
      }
      setTimeout(() => setNavReady(true), 0);
    }
  }, [user, loading, router]);

  if (loading || !user || (user.role !== 'sales' && user.role !== 'manager' && user.role !== 'admin')) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen bg-muted/40${  !navReady ? " pointer-events-none select-none opacity-80" : ""  }${!navReady ? " transition-opacity" : ""}` }>
      <div className={!navReady ? "animate-pulse" : undefined}>
        <SalesSidebar />
      </div>
      <main className="flex-1 p-4 sm:p-6">{children}</main>
      <Toaster />
    </div>
  );
}
