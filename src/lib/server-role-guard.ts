import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { ALL_ROLES, isAtLeast, type UserRole } from './roles';
import { createClient } from './supabase/server';

const DEFAULT_ROLE: UserRole = 'customer';

type NullableRole = UserRole | null;

const normalizeRole = (value: unknown): NullableRole => {
  if (typeof value !== 'string') {
    return null;
  }

  const lower = value.trim().toLowerCase() as UserRole;
  return ALL_ROLES.includes(lower) ? lower : null;
};

const fetchProfileRole = async (supabase: SupabaseClient, userId: string): Promise<NullableRole> => {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    return normalizeRole(data?.role);
  } catch {
    return null;
  }
};

export interface RoleCheckOptions {
  allowedRoles?: UserRole[];
  minimumRole?: UserRole;
}

export interface ServerAuthState {
  supabase: SupabaseClient;
  session: Session | null;
  role: UserRole;
}

export async function getServerAuthState(): Promise<ServerAuthState> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  const session = data.session ?? null;

  if (!session?.user) {
    return { supabase, session: null, role: DEFAULT_ROLE };
  }

  let resolvedRole = normalizeRole(session.user.app_metadata?.role) ?? DEFAULT_ROLE;
  const profileRole = await fetchProfileRole(supabase, session.user.id);
  if (profileRole) {
    resolvedRole = profileRole;
  }

  return { supabase, session, role: resolvedRole };
}

export const roleMatches = (role: UserRole, options: RoleCheckOptions): boolean => {
  const { allowedRoles, minimumRole } = options;

  const allowedMatch = Array.isArray(allowedRoles) && allowedRoles.length > 0
    ? allowedRoles.includes(role)
    : false;

  const hierarchyMatch = minimumRole ? isAtLeast(role, minimumRole) : false;

  if (allowedRoles && allowedRoles.length > 0) {
    return allowedMatch || hierarchyMatch;
  }

  if (minimumRole) {
    return hierarchyMatch;
  }

  return true;
};

export async function requireApiRole(options: RoleCheckOptions = {}) {
  const { supabase, session, role } = await getServerAuthState();

  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  }

  if (!roleMatches(role, options)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) } as const;
  }

  return { supabase, session, role } as const;
}
