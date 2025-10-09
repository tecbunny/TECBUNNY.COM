import type { User } from '@supabase/supabase-js';

import { createClient, createServiceClient } from '../../lib/supabase/server';
import { logger } from '../../lib/logger';

type AdminRole = 'admin' | 'manager' | 'superadmin';

export class AdminAuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface AdminContext {
  user: User;
  role: AdminRole;
  serviceSupabase: ReturnType<typeof createServiceClient>;
}

function isAdminRole(role: unknown): role is AdminRole {
  return role === 'admin' || role === 'manager' || role === 'superadmin';
}

export async function requireAdminContext(): Promise<AdminContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.warn('admin_auth_get_user_failed', { error: error.message });
  }

  if (!user) {
    throw new AdminAuthError(401, 'Authentication required');
  }

  const serviceSupabase = createServiceClient();
  const { data: profile, error: profileError } = await serviceSupabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    logger.warn('admin_auth_profile_lookup_failed', {
      error: profileError.message,
      code: profileError.code,
    });
    throw new AdminAuthError(500, 'Failed to verify admin profile');
  }

  if (!profile || !isAdminRole(profile.role)) {
    throw new AdminAuthError(403, 'Insufficient permissions');
  }

  return {
    user,
    role: profile.role,
    serviceSupabase,
  };
}