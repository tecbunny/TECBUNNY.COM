'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../../../lib/hooks';
import { isAtLeast } from '../../../lib/roles';
import { AdminSidebar } from '../../../components/admin/AdminSidebar';
import { Toaster } from '../../../components/ui/toaster';

interface AdminLayoutClientProps {
  children: React.ReactNode;
}

export default function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const { user, loading, supabase } = useAuth();
  const router = useRouter();
  const redirectRef = React.useRef(false);

  React.useEffect(() => {
    if (loading) return;
    if (redirectRef.current) return;
    if (!user) {
      redirectRef.current = true;
      router.replace('/auth/signin');
      return;
    }
    const userRole = (user as any)?.role || 'customer';
    if (!isAtLeast(userRole, 'admin')) {
      redirectRef.current = true;
      router.replace('/');
    }
  }, [loading, user, router]);

  React.useEffect(() => {
    if (!loading) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      if (cancelled) return;
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session && !cancelled) {
          // rely on provider subscription
        }
      } catch {
        // ignore errors during fallback fetch
      }
    }, 2000);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [loading, supabase]);

  const userRole = (user as any)?.role || 'customer';
  const authorized = !!user && isAtLeast(userRole, 'admin');

  return (
    <div className="flex min-h-screen bg-muted/40" data-auth-state={authorized ? 'authorized' : (loading ? 'checking' : 'redirecting')}>
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-background border rounded px-3 py-1 text-sm z-50"
      >
        Skip to main content
      </a>
      <div>
        <AdminSidebar />
      </div>
      <main
        id="admin-main"
        className="flex-1 p-4 sm:p-6 focus:outline-none relative"
        tabIndex={-1}
        data-sidebar-ready={authorized || undefined}
        aria-label="Admin main content"
        aria-busy={loading && !authorized}
      >
        {children}
        {loading && !authorized && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm" aria-live="polite">
            <div className="flex items-center gap-3 px-4 py-2 rounded-md border bg-background shadow-sm">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
              <span className="text-sm text-muted-foreground">Checking access…</span>
            </div>
          </div>
        )}
      </main>
      <Toaster />
    </div>
  );
}
