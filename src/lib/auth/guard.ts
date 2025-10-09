import type { UserRole } from '../roles';
import { isAtLeast, ALL_ROLES } from '../roles';
import { createClient, createServiceClient, isSupabaseServiceConfigured } from '../supabase/server';
import { logger } from '../logger';

const ROLE_SET = new Set<UserRole>(ALL_ROLES);

function normalizeRole(value: unknown): UserRole | null {
  if (typeof value !== 'string' || !value) return null;
  if (ROLE_SET.has(value as UserRole)) {
    return value as UserRole;
  }

  const lower = value.toLowerCase() as UserRole;
  return ROLE_SET.has(lower) ? lower : null;
}

// Standard server-side role guard returning a discriminated union
export async function requireRole(minRole: UserRole) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { error: 'Unauthorized', status: 401 } as const;
  }

  const metadataRole = normalizeRole((user.app_metadata as Record<string, unknown> | undefined)?.role);
  let role = metadataRole;
  let profileRole: UserRole | null = null;
  let profileExists = false;

  if (!role) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, name, email, mobile')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      logger.warn('requireRole.profile_fetch_failed', {
        userId: user.id,
        error: profileError.message,
        code: profileError.code
      });
    }

    if (profile) {
      profileExists = true;
      profileRole = normalizeRole((profile as Record<string, unknown>).role);
      if (profileRole) {
        role = profileRole;
      }
    }
  }

  if (!role) {
    const fallbackRole = normalizeRole((user.user_metadata as Record<string, unknown> | undefined)?.role);
    if (fallbackRole) {
      role = fallbackRole;
    }
  }

  if (!role) {
    logger.warn('requireRole.role_missing', {
      userId: user.id,
      email: user.email,
      appMetadata: user.app_metadata
    });
    return { error: 'Forbidden', status: 403 } as const;
  }

  if (!isAtLeast(role, minRole)) {
    return { error: 'Forbidden', status: 403 } as const;
  }

  const service = createServiceClient();

  // Opportunistically synchronize app_metadata.role so future checks are fast
  if (isSupabaseServiceConfigured && role !== metadataRole) {
    try {
      await service.auth.admin.updateUserById(user.id, {
        app_metadata: { ...(user.app_metadata || {}), role }
      });
    } catch (syncError) {
      logger.warn('requireRole.metadata_sync_failed', {
        userId: user.id,
        error: syncError instanceof Error ? syncError.message : String(syncError)
      });
    }
  }

  // Ensure profiles table reflects authoritative role for downstream RLS checks
  if (isSupabaseServiceConfigured) {
    try {
      if (profileExists) {
        if (profileRole && profileRole !== role) {
          await service
            .from('profiles')
            .update({ role })
            .eq('id', user.id);
        }
      } else {
        const name = (user.user_metadata as Record<string, unknown> | undefined)?.name
          || (user.user_metadata as Record<string, unknown> | undefined)?.full_name
          || user.email?.split('@')[0]
          || 'User';
        const mobile = (user.user_metadata as Record<string, unknown> | undefined)?.mobile ?? null;

        await service.from('profiles').insert({
          id: user.id,
          name,
          email: user.email ?? '',
          mobile,
          role
        });
      }
    } catch (profileSyncError) {
      logger.warn('requireRole.profile_sync_failed', {
        userId: user.id,
        error: profileSyncError instanceof Error ? profileSyncError.message : String(profileSyncError)
      });
    }
  }

  return { user, role, supabase, service } as const;
}
