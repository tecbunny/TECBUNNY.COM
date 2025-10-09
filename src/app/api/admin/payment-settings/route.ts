import { NextRequest, NextResponse } from 'next/server';

import { logger } from '../../../../lib/logger';
import { isAdmin } from '../../../../lib/permissions';
import { createClient as createRouteClient } from '../../../../lib/supabase/server';
import { createSupabaseServiceClient } from '../../../../lib/supabase-server';

async function assertAdmin() {
  const supabase = await createRouteClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    logger.error('payment_settings.auth_failed', { error });
    return { response: NextResponse.json({ error: 'Authentication failed' }, { status: 500 }) };
  }

  if (!user || !(await isAdmin(user))) {
    return { response: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) };
  }

  return { user };
}

export async function GET() {
  try {
    const authResult = await assertAdmin();
    if ('response' in authResult) {
      return authResult.response;
    }

    const supabase = createSupabaseServiceClient();
    
    // Fetch payment settings from the settings table
    const { data: settings, error } = await supabase
      .from('settings')
      .select('key, value')
      .like('key', 'payment_%');

    if (error) {
      logger.error('payment_settings.fetch_failed', { error });
      return NextResponse.json({ error: 'Failed to fetch payment settings' }, { status: 500 });
    }

    const paymentSettings = {
      razorpay: { id: 'razorpay', name: 'Razorpay', type: 'online', enabled: false, config: {} },
      stripe: { id: 'stripe', name: 'Stripe', type: 'online', enabled: false, config: {} },
      phonepe: { id: 'phonepe', name: 'PhonePe', type: 'online', enabled: false, config: {} },
      paytm: { id: 'paytm', name: 'Paytm', type: 'online', enabled: false, config: {} },
      cashfree: { id: 'cashfree', name: 'Cashfree', type: 'online', enabled: false, config: {} },
      cod: { id: 'cod', name: 'Cash on Delivery', type: 'offline', enabled: true, config: {} },
      upi: { id: 'upi', name: 'UPI/QR Code', type: 'offline', enabled: true, config: {} }
    };

    if (settings && settings.length > 0) {
      settings.forEach((setting) => {
        const key = setting.key.replace('payment_', '');
        const value = setting.value;
        
        try {
          // Value is already JSONB from database, no need to parse if it's an object
          const parsedValue = typeof value === 'string' ? JSON.parse(value) : value;
          if (paymentSettings[key as keyof typeof paymentSettings]) {
            paymentSettings[key as keyof typeof paymentSettings] = {
              ...paymentSettings[key as keyof typeof paymentSettings],
              ...parsedValue
            };
          }
        } catch (e) {
          logger.warn('payment_settings.parse_failed', { key, value, error: e });
        }
      });
    }

    return NextResponse.json({ paymentSettings });
  } catch (error) {
    logger.error('payment_settings.get_unhandled', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await assertAdmin();
    if ('response' in authResult) {
      return authResult.response;
    }

    const supabase = createSupabaseServiceClient();
    const { methodId, updates } = await request.json();

    if (!methodId || !updates) {
      return NextResponse.json({ error: 'Method ID and updates are required' }, { status: 400 });
    }

  logger.info('payment_settings.update_start', { methodId, updates });

    // First, get the current settings
    const { data: currentSettings, error: fetchError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', `payment_${methodId}`)
      .single();

    let currentMethod = {
      id: methodId,
      name: methodId.charAt(0).toUpperCase() + methodId.slice(1),
      type: ['cod', 'upi'].includes(methodId) ? 'offline' : 'online',
      enabled: false,
      config: {}
    };

    if (currentSettings && !fetchError) {
      try {
        // Value is already JSONB from database, no need to parse if it's an object
        const parsedValue = typeof currentSettings.value === 'string' 
          ? JSON.parse(currentSettings.value) 
          : currentSettings.value;
        currentMethod = { ...currentMethod, ...parsedValue };
      } catch (e) {
        logger.warn('payment_settings.existing_parse_failed', { methodId, error: e });
      }
    }

    // Merge with updates
    const updatedMethod = { ...currentMethod, ...updates };

  logger.debug('payment_settings.update_result', { methodId, updatedMethod });

    // Save to database using upsert
    const { error: upsertError } = await supabase
      .from('settings')
      .upsert({
        key: `payment_${methodId}`,
        value: JSON.stringify(updatedMethod)
      });

    if (upsertError) {
      logger.error('payment_settings.upsert_failed', { error: upsertError, methodId });
      return NextResponse.json({ error: 'Failed to save payment settings' }, { status: 500 });
    }

    logger.info('payment_settings.update_success', { methodId });

    return NextResponse.json({ success: true, method: updatedMethod });
  } catch (error) {
    logger.error('payment_settings.put_unhandled', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}