import { NextResponse } from 'next/server';

import { createClient } from '../../../lib/supabase/server';
import { requireAdmin } from '../../../lib/admin-auth';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { isAdmin } = await requireAdmin(user, supabase);

    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if environment variables exist
    const envCheck = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      supabaseUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20)  }...` || 'Not set',
    };

    // Simple connectivity test
    try {
      const { data: _data, error } = await supabase.auth.getSession();
      return NextResponse.json({
        status: 'success',
        message: 'Supabase connection test completed',
        environment: envCheck,
        connectionTest: error ? 'failed' : 'success',
        error: error?.message || null
      });
    } catch (connectionError) {
      return NextResponse.json({
        status: 'error',
        message: 'Supabase connection failed',
        environment: envCheck,
        connectionTest: 'failed',
        error: connectionError instanceof Error ? connectionError.message : 'Unknown error'
      });
    }
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Environment check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}