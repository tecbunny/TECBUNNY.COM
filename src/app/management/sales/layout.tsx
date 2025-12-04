import type { ReactNode } from 'react';

import { redirect } from 'next/navigation';

import { getServerAuthState, roleMatches, type RoleCheckOptions } from '../../../lib/server-role-guard';

import SalesLayoutClient from './SalesLayoutClient';

const SALES_ACCESS: RoleCheckOptions = {
  allowedRoles: ['sales', 'manager'],
  minimumRole: 'admin'
};

export default async function SalesLayout({ children }: { children: ReactNode }) {
  const { session, role } = await getServerAuthState();

  if (!session) {
    redirect('/auth/signin');
  }

  if (!roleMatches(role, SALES_ACCESS)) {
    redirect('/');
  }

  return <SalesLayoutClient>{children}</SalesLayoutClient>;
}
