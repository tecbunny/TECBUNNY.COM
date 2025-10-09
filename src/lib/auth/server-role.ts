import type { NextRequest } from 'next/server';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

import type { UserRole } from '../types';
import { createClient as createServerClient, createServiceClient, isSupabaseServiceConfigured } from '../supabase/server';
import { logger } from '../logger';

const VALID_ROLES: ReadonlySet<UserRole> = new Set([
  'customer',
  'sales',
  'service_engineer',
  'accounts',
  'manager',
  'admin',
  'superadmin'
]);

const ROLE_KEYS = ['role', 'default_role', 'app_role', 'user_role'] as const;
const ROLE_ARRAY_KEYS = ['roles', 'app_roles'] as const;

type MetadataRecord = Record<string, unknown> | null | undefined;

const parseRole = (value: unknown): UserRole | null => {
  if (typeof value !== 'string' || !value) return null;
  const normalized = value.trim().toLowerCase() as UserRole;
  return VALID_ROLES.has(normalized) ? normalized : null;
};

const extractRoleFromMetadata = (metadata: MetadataRecord): UserRole | null => {
  if (!metadata || typeof metadata !== 'object') return null;
  const metaRecord = metadata as Record<string, unknown>;

  for (const key of ROLE_KEYS) {
    if (key in metaRecord) {
      const parsed = parseRole(metaRecord[key]);
      if (parsed) {
        return parsed;
      }
    }
  }

  for (const key of ROLE_ARRAY_KEYS) {
    const candidate = metaRecord[key];
    if (Array.isArray(candidate)) {
      for (const value of candidate) {
        const parsed = parseRole(value);
        if (parsed) {
          return parsed;
        }
      }
    }
  }

  return null;
};

const resolveProfileRole = async (user: SupabaseUser, desiredRole: UserRole | null): Promise<UserRole | null> => {
  if (!isSupabaseServiceConfigured) {
    return desiredRole;
  }

  try {
    const service = createServiceClient();
    const { data: profile, error } = await service
      .from('profiles')
      .select('id, email, name, mobile, role, email_verified, email_confirmed_at')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      logger.warn('server-role.profile_lookup_failed', { error: error.message, code: error.code });
    }

    let finalRole = desiredRole ?? parseRole(profile?.role) ?? 'customer';

    if (!profile) {
      const insertPayload = {
        id: user.id,
        name: (user.user_metadata?.name as string | undefined) || user.email?.split('@')[0] || 'User',
        email: user.email ?? `user-${user.id}@placeholder.local`,
        mobile: (user.user_metadata?.mobile as string | undefined) || user.phone || null,
        role: finalRole,
        email_verified: Boolean(user.email_confirmed_at),
        email_confirmed_at: user.email_confirmed_at,
        updated_at: new Date().toISOString()
      };

      const { error: insertError } = await service
        .from('profiles')
        .insert(insertPayload)
        .select()
        .maybeSingle();

      if (insertError && insertError.code !== '23505') { // ignore duplicate inserts
        logger.error('server-role.profile_insert_failed', { error: insertError.message, code: insertError.code });
      }
    } else {
      if (!parseRole(profile.role) && finalRole) {
        // profile exists but role invalid, set to finalRole
        const { error: updateError } = await service
          .from('profiles')
          .update({ role: finalRole, updated_at: new Date().toISOString() })
          .eq('id', user.id);
        if (updateError) {
          logger.error('server-role.profile_update_failed', { error: updateError.message, code: updateError.code });
        }
      } else if (finalRole && profile.role !== finalRole) {
        // sync role with desired role when different
        const { error: roleSyncError } = await service
          .from('profiles')
          .update({ role: finalRole, updated_at: new Date().toISOString() })
          .eq('id', user.id);
        if (roleSyncError) {
          logger.warn('server-role.profile_role_sync_failed', { error: roleSyncError.message, code: roleSyncError.code });
          finalRole = parseRole(profile.role) ?? finalRole;
        }
      } else {
        finalRole = parseRole(profile.role) ?? finalRole;
      }
    }

    return finalRole;
  } catch (error) {
    logger.error('server-role.unexpected_profile_sync_error', { error });
    return desiredRole;
  }
};

export const getEffectiveUserRole = async (user: SupabaseUser | null): Promise<UserRole | null> => {
  if (!user) return null;

  const metadataRole = extractRoleFromMetadata(user.app_metadata as MetadataRecord)
    ?? extractRoleFromMetadata(user.user_metadata as MetadataRecord);

  return resolveProfileRole(user, metadataRole);
};

export const getSessionWithRole = async (_request: NextRequest): Promise<{
  supabase: Awaited<ReturnType<typeof createServerClient>>;
  session: Session | null;
  role: UserRole | null;
}> => {
  const supabase = await createServerClient();
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      return { supabase, session: null, role: null };
    }

    const role = await getEffectiveUserRole(session.user);
    return { supabase, session, role };
  } catch (error) {
    logger.error('server-role.session_fetch_failed', { error });
    return { supabase, session: null, role: null };
  }
};

export const isRoleAllowed = (role: UserRole | null, allowed: ReadonlyArray<UserRole>): boolean => {
  if (!role) return false;
  return allowed.includes(role);
};
