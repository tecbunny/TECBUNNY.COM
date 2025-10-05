import { NextRequest, NextResponse } from 'next/server';

import { zohoSyncService } from '../../../../../lib/zoho-sync-service';
import { logger } from '../../../../../lib/logger';
import { isSupabaseServiceConfigured } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/zoho/sync/customers
 * Sync customers to ZOHO CRM
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { batchSize = 50 } = body;

    logger.info('Starting customer sync to ZOHO CRM');

    if (!isSupabaseServiceConfigured) {
      logger.warn('zoho_sync_supabase_not_configured', { route: 'customers' });
      return NextResponse.json({
        success: false,
        message: 'Supabase configuration missing. ZOHO customer sync is unavailable.',
        synced: 0,
        failed: 0,
        errors: ['Supabase configuration missing'],
        details: [],
      }, { status: 503 });
    }

    const result = await zohoSyncService.syncCustomersToZoho({ batchSize });

    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? `Successfully synced ${result.synced} customers to ZOHO CRM`
        : 'Customer sync completed with errors',
      synced: result.synced,
      failed: result.failed,
      errors: result.errors,
      details: result.details,
    });
  } catch (error) {
    logger.error('Customer sync API error', { error });
    return NextResponse.json(
      { error: 'Failed to sync customers to ZOHO CRM' },
      { status: 500 }
    );
  }
}