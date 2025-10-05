import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { logger } from '../../../lib/logger';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-placeholder';
const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!isSupabaseConfigured) {
      logger.error('superadmin.create.missing_supabase_config');
      return NextResponse.json(
        {
          error: 'Supabase configuration missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
        },
        { status: 503 }
      );
    }

    if (!email || !password) {
      logger.warn('superadmin.create.validation_failed', { email });
      return NextResponse.json(
        {
          error: 'Email and password are required to create a superadmin account.'
        },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    logger.info('superadmin.create.start', { email });

    // Create user with admin client
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Mark email as verified
      user_metadata: {
        name: name || 'Tecbunny Solutions Super Admin'
      }
    });

    if (createError) {
      logger.error('superadmin.create.user_failed', { email, error: createError });
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    logger.info('superadmin.create.user_success', { userId: userData.user.id });

    // Create profile with admin role
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([
        {
          id: userData.user.id,
          email,
          full_name: name || 'Tecbunny Solutions Super Admin',
          role: 'admin'
        }
      ]);

    if (profileError) {
      logger.error('superadmin.create.profile_failed', { userId: userData.user.id, error: profileError });
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Superadmin account created successfully!',
      user: {
        id: userData.user.id,
        email,
        role: 'admin',
        verified: true
      }
    });

  } catch (error) {
    logger.error('superadmin.create.unexpected_error', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}