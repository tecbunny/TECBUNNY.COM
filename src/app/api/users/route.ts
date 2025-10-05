import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { resolveSiteUrl } from '../../../lib/site-url';
import { createClient as createServerClient } from '../../../lib/supabase/server';
import { logger } from '../../../lib/logger';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.local';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// Create admin client for user management
const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Create client for current user authentication
async function createAuthenticatedClient(request: NextRequest) {
  // Try to get authorization from header first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );
    
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      return { supabase, session };
    }
    
    // Try to set session with token
    const { data, error: setError } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: token
    });
    
    if (!setError && data.session) {
      return { supabase, session: data.session };
    }
  }

  // Fallback to server-side cookie-based authentication
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  return { supabase, session };
}

// GET /api/users - List all users (admin only)
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      logger.error('users.supabase_configuration_missing');
      return NextResponse.json({ error: 'Service configuration error' }, { status: 503 });
    }
    const { supabase, session } = await createAuthenticatedClient(request);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!profile || !['superadmin', 'admin', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get users with profiles
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      logger.error('Error fetching auth users:', { error: authError });
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Get profiles for all users
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*');

    if (profilesError) {
      logger.error('Error fetching profiles:', { error: profilesError });
      return NextResponse.json({ error: 'Failed to fetch user profiles' }, { status: 500 });
    }

    // Combine auth and profile data
    const usersWithProfiles = users.map(user => {
      const profile = profiles.find(p => p.id === user.id);
      return {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        last_sign_in_at: user.last_sign_in_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
        banned_until: (user as { banned_until?: string }).banned_until || null,
        profile: profile || null
      };
    });

    return NextResponse.json({
      users: usersWithProfiles,
      total: users.length
    });

  } catch (error) {
    logger.error('Error in GET /api/users:', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/users - Create new user (admin only)
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      logger.error('users.supabase_configuration_missing');
      return NextResponse.json({ error: 'Service configuration error' }, { status: 503 });
    }
    const { supabase, session } = await createAuthenticatedClient(request);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or manager (allow managers to create accounts too)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!profile || !['superadmin', 'admin', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const email = body.email as string | undefined;
    const name = body.name as string | undefined;
    const role = (body.role as string | undefined) || 'customer';
    const mobile = body.mobile as string | undefined;
    let password = body.password as string | undefined;

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
    }

    // Auto-generate a strong password if not provided
    if (!password || password.trim() === '') {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()_+';
      const random = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      password = `${random(4)}-${random(4)}-${random(4)}`; // e.g., Ab9!-xY7@-Kp3#
    }

    // Create user with admin client, mark email as confirmed
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role
      }
    });

    if (createError) {
      logger.error('Error creating user:', { error: createError });
      return NextResponse.json({ 
        error: createError.message || 'Failed to create user' 
      }, { status: 400 });
    }

    // Create or update profile with additional fields
    if (userData.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userData.user.id,
          name,
          email,
          role,
          mobile: mobile || null,
          is_active: true,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (profileError) {
        logger.error('Error creating profile:', { error: profileError });
        // Try to clean up the auth user if profile creation failed
        await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
        return NextResponse.json({ 
          error: 'Failed to create user profile' 
        }, { status: 500 });
      }
    }

    // Send credentials via email (no verification required)
    try {
      const improvedEmailService = (await import('../../../lib/improved-email-service')).default;
  const siteUrl = resolveSiteUrl(request.headers.get('host') || undefined);
      const subject = 'Your Account Has Been Created - TecBunny Store';
      const html = `
        <div style="font-family: Arial, sans-serif; line-height:1.6;">
          <h2>Welcome to TecBunny Store, ${name}!</h2>
          <p>Your account was created by an administrator. Email verification is not required.</p>
          <p><strong>Login Email:</strong> ${email}<br/>
             <strong>Temporary Password:</strong> ${password}</p>
          <p>
            You can sign in here: <a href="${siteUrl}/auth/signin">${siteUrl}/auth/signin</a><br/>
            For security, please change your password after first login from your profile settings.
          </p>
          <p>If you didn’t expect this, contact support at sales@tecbunny.com.</p>
        </div>
      `;
      await improvedEmailService.sendEmail({ to: email, subject, html });
    } catch (e) {
      logger.error('Failed to send credentials email:', { error: e });
      // Continue without failing the request
    }

    return NextResponse.json({
      message: 'User created successfully',
      user: {
        id: userData.user?.id,
        email: userData.user?.email,
        created_at: userData.user?.created_at
      }
    });

  } catch (error) {
    logger.error('Error in POST /api/users:', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/users - Update user (admin only)
export async function PUT(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      logger.error('users.supabase_configuration_missing');
      return NextResponse.json({ error: 'Service configuration error' }, { status: 503 });
    }
    const { supabase, session } = await createAuthenticatedClient(request);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!profile || !['admin', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId, updates } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Update user metadata if provided
    if (updates.email || updates.password || updates.email_confirm !== undefined) {
      const authUpdates: {
        email?: string;
        password?: string;
        email_confirm?: boolean;
      } = {};
      if (updates.email) authUpdates.email = updates.email;
      if (updates.password) authUpdates.password = updates.password;
      if (updates.email_confirm !== undefined) authUpdates.email_confirm = updates.email_confirm;

      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdates);
      
      if (authError) {
        logger.error('Error updating auth user:', { error: authError });
        return NextResponse.json({ 
          error: authError.message || 'Failed to update user' 
        }, { status: 400 });
      }
    }

    // Update profile if provided
    if (updates && Object.keys(updates).length > 0) {
      // Build update object, accepting both camelCase and snake_case keys
      const profileUpdates: Record<string, any> = {};
      if (updates.name) profileUpdates.name = updates.name;
      if (updates.role) profileUpdates.role = updates.role;
      if (updates.mobile) profileUpdates.mobile = updates.mobile;
      if (typeof updates.is_active === 'boolean') profileUpdates.is_active = updates.is_active;
      if (typeof updates.isActive === 'boolean') profileUpdates.is_active = updates.isActive;
      if (updates.address) profileUpdates.address = updates.address;
      if (updates.gstin) profileUpdates.gstin = updates.gstin;

      const customerCategory = updates.customer_category ?? updates.customerCategory;
      if (customerCategory) profileUpdates.customer_category = customerCategory;

      if (updates.discount_percentage !== undefined) profileUpdates.discount_percentage = updates.discount_percentage;
      if (updates.discountPercentage !== undefined) profileUpdates.discount_percentage = updates.discountPercentage;

      // Always stamp updated_at
      profileUpdates.updated_at = new Date().toISOString();

      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update(profileUpdates)
          .eq('id', userId);

        if (profileError) {
          logger.error('Error updating profile:', { error: profileError });
          return NextResponse.json({ 
            error: 'Failed to update user profile' 
          }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ message: 'User updated successfully' });

  } catch (error) {
    logger.error('Error in PUT /api/users:', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/users - Delete user (admin only)
export async function DELETE(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      logger.error('users.supabase_configuration_missing');
      return NextResponse.json({ error: 'Service configuration error' }, { status: 503 });
    }
    const { supabase, session } = await createAuthenticatedClient(request);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Don't allow deleting self
    if (userId === session.user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Delete user (this will cascade to profile due to foreign key)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      logger.error('Error deleting user:', { error: deleteError });
      return NextResponse.json({ 
        error: deleteError.message || 'Failed to delete user' 
      }, { status: 400 });
    }

    return NextResponse.json({ message: 'User deleted successfully' });

  } catch (error) {
    logger.error('Error in DELETE /api/users:', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}