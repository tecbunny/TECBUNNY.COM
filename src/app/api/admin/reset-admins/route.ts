import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.local';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function isAuthorized(req: NextRequest) {
  const token = req.headers.get('x-admin-token');
  return !!token && token === process.env.ADMIN_MAINT_TOKEN;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Service configuration error. Please contact support.' }, { status: 503 });
  }

  try {
    const { email: newEmail, password: newPassword, name: newName } = await request.json();
    if (!newEmail || !newPassword) {
      return NextResponse.json({ error: 'email and password are required' }, { status: 400 });
    }

    // 1) Ensure target admin exists (create or update)
    // Try to find existing profile by email
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, is_active')
      .eq('email', newEmail)
      .maybeSingle();

    let newAdminUserId: string | null = null;

    if (existingProfile?.id) {
      newAdminUserId = existingProfile.id;
      // Update password and confirm email for the existing auth user
  await supabaseAdmin.auth.admin.updateUserById(newAdminUserId!, {
        password: newPassword,
        email_confirm: true
      });
      // Ensure profile is active admin
      await supabaseAdmin
        .from('profiles')
        .update({ role: 'admin', is_active: true, name: newName || 'Admin' })
        .eq('id', newAdminUserId);
    } else {
      // Create new auth user as admin
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: newEmail,
        password: newPassword,
        email_confirm: true,
        user_metadata: { role: 'admin', name: newName || 'Admin' }
      });
      if (createErr || !created.user) {
        return NextResponse.json({ error: createErr?.message || 'Failed to create admin user' }, { status: 500 });
      }
      newAdminUserId = created.user.id;
      // Create profile
      await supabaseAdmin
        .from('profiles')
        .upsert({
          id: newAdminUserId,
          email: newEmail,
          name: newName || 'Admin',
          role: 'admin',
          is_active: true
        });
    }

    // 2) Remove all other admins (auth user and profile)
    const { data: adminProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('role', 'admin');

    const toDelete = (adminProfiles || []).filter((p) => p.id !== newAdminUserId);
    for (const p of toDelete) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(p.id);
      } catch (_) {}
      await supabaseAdmin.from('profiles').delete().eq('id', p.id);
    }

    return NextResponse.json({ ok: true, adminUserId: newAdminUserId, removed: toDelete.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 30;
