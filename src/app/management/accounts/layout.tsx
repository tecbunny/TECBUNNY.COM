import type { ReactNode } from 'react';

import { redirect } from 'next/navigation';

import { getServerAuthState, roleMatches, type RoleCheckOptions } from '../../../lib/server-role-guard';

import AccountsLayoutClient from './AccountsLayoutClient';

const ACCOUNTING_ACCESS: RoleCheckOptions = {
  allowedRoles: ['accounts', 'manager'],
  minimumRole: 'admin'
};

export default async function AccountsLayout({ children }: { children: ReactNode }) {
  const { session, role } = await getServerAuthState();

  if (!session) {
    redirect('/auth/signin');
  }

  if (!roleMatches(role, ACCOUNTING_ACCESS)) {
    redirect('/');
  }

  return <AccountsLayoutClient>{children}</AccountsLayoutClient>;
}
