import type { ReactNode } from 'react';

import { redirect } from 'next/navigation';

import { getServerAuthState, roleMatches, type RoleCheckOptions } from '../../../lib/server-role-guard';

import AdminLayoutClient from './AdminLayoutClient';

const ADMIN_ACCESS: RoleCheckOptions = {
  minimumRole: 'admin'
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { session, role } = await getServerAuthState();

  if (!session) {
    redirect('/auth/signin');
  }

  if (!roleMatches(role, ADMIN_ACCESS)) {
    redirect('/');
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
