import type { UserRole } from '../roles';
import { isAtLeast } from '../roles';
import { createClient, createServiceClient } from '../supabase/server';

// Standard server-side role guard returning a discriminated union
export async function requireRole(minRole: UserRole) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { error: 'Unauthorized', status: 401 } as const;
  }

  const role = (user.app_metadata?.role as UserRole) || 'customer';
  if (!isAtLeast(role, minRole)) {
    return { error: 'Forbidden', status: 403 } as const;
  }

  const service = createServiceClient();
  return { user, role, supabase, service } as const;
}
