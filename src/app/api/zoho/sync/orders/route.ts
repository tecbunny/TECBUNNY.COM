import { NextRequest, NextResponse } from 'next/server';

import { zohoSyncService } from '../../../../../lib/zoho-sync-service';
import { logger } from '../../../../../lib/logger';
import { isSupabaseServiceConfigured } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/zoho/sync/orders
 * Sync orders to ZOHO Inventory as Sales Orders
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { 
      orderIds,
      batchSize = 50 
    } = body;

    logger.info('Starting order sync to ZOHO Inventory');

    if (!isSupabaseServiceConfigured) {
      logger.warn('zoho_sync_supabase_not_configured', { route: 'orders' });
      return NextResponse.json({
        success: false,
        message: 'Supabase configuration missing. ZOHO order sync is unavailable.',
        synced: 0,
        failed: 0,
        errors: ['Supabase configuration missing'],
        details: [],
      }, { status: 503 });
    }

    const result = await zohoSyncService.syncOrdersToZoho({ orderIds, batchSize });

    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? `Successfully synced ${result.synced} orders to ZOHO Inventory`
        : 'Order sync completed with errors',
      synced: result.synced,
      failed: result.failed,
      errors: result.errors,
      details: result.details,
    });
  } catch (error) {
    logger.error('Order sync API error', { error });
    return NextResponse.json(
      { error: 'Failed to sync orders to ZOHO Inventory' },
      { status: 500 }
    );
  }
}