import { NextRequest, NextResponse } from 'next/server';

import { logger } from '../../../../lib/logger';
import { AdminAuthError, requireAdminContext } from '../../../../lib/auth/admin-guard';

export async function GET(_: NextRequest) {
  try {
    const { serviceSupabase } = await requireAdminContext();

    // Get all security settings
    const { data: settings, error } = await serviceSupabase
      .from('security_settings')
      .select('setting_key, setting_value, description')
      .eq('is_active', true)
      .order('setting_key');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform array to object for easier access
    const settingsObject = (settings || []).reduce((acc: Record<string, { value: any; description: string | null }>, setting: any) => {
      acc[String(setting.setting_key)] = {
        value: setting.setting_value,
        description: setting.description ?? null,
      };
      return acc;
    }, {} as Record<string, { value: any; description: string | null }>);

    return NextResponse.json({
      success: true,
      settings: settingsObject
    });

  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error('Error fetching security settings:', { error });
    return NextResponse.json(
      { error: 'Failed to fetch security settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, role, serviceSupabase } = await requireAdminContext();

    const body = await request.json();
    const { setting_key, setting_value, description } = body;

    if (!setting_key || !setting_value) {
      return NextResponse.json(
        { error: 'setting_key and setting_value are required' },
        { status: 400 }
      );
    }

    // Update or insert security setting
    const { data, error } = await serviceSupabase
      .from('security_settings')
      .upsert({
        setting_key,
        setting_value,
        description,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'setting_key'
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the security setting change
    await serviceSupabase
      .from('security_audit_log')
      .insert({
        event_type: 'security_setting_updated',
        user_id: user.id,
        event_data: {
          setting_key,
          new_value: setting_value,
          description,
          updated_by_role: role,
        },
        severity: 'medium'
      });

    return NextResponse.json({
      success: true,
      setting: data
    });

  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    logger.error('Error updating security setting:', { error });
    return NextResponse.json(
      { error: 'Failed to update security setting' },
      { status: 500 }
    );
  }
}