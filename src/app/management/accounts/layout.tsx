'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../../../lib/hooks';
import { AccountsSidebar } from '../../../components/accounts/AccountsSidebar';
import { Toaster } from '../../../components/ui/toaster';

export default function AccountsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [navReady, setNavReady] = React.useState(false);

  React.useEffect(() => {
    if (!loading) {
      if (!user || user.role !== 'accounts') {
        router.replace('/');
        return;
      }
      setTimeout(() => setNavReady(true), 0);
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'accounts') {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen bg-muted/40${  !navReady ? " pointer-events-none select-none opacity-80" : ""  }${!navReady ? " transition-opacity" : ""}` }>
      <div className={!navReady ? "animate-pulse" : undefined}>
        <AccountsSidebar />
      </div>
      <main className="flex-1 p-4 sm:p-6">{children}</main>
      <Toaster />
    </div>
  );
}
