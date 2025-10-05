import { NextResponse } from 'next/server';

import { createClient } from '../../../lib/supabase/client';
import { logger } from '../../../lib/logger';

export async function GET() {
  try {
    const supabase = createClient();
    
    // Get current logo and favicon settings
    const { data: settings, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['logoUrl', 'faviconUrl']);

    if (error) {
      throw error;
    }

    const logoUrl = settings?.find(s => s.key === 'logoUrl')?.value || '';
    const faviconUrl = settings?.find(s => s.key === 'faviconUrl')?.value || '';

    return NextResponse.json({
      success: true,
      settings: {
        logoUrl,
        faviconUrl
      },
      raw: settings
    });

  } catch (error) {
    logger.error('check_settings_error', { error });
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}