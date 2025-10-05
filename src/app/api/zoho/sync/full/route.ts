import { NextRequest, NextResponse } from 'next/server';

import { zohoSyncService, SyncOptions } from '../../../../../lib/zoho-sync-service';
import { logger } from '../../../../../lib/logger';
import { isSupabaseServiceConfigured } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/zoho/sync/full
 * Full bidirectional sync of all modules
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { 
      direction = 'to_zoho', // 'to_zoho' | 'from_zoho' | 'bidirectional'
      modules = ['crm', 'inventory'], // ['crm', 'inventory', 'products', 'orders', 'customers']
      batchSize = 50,
      dryRun = false
    } = body;

    logger.info('Starting full ZOHO sync', { direction, modules });

    const options: SyncOptions = {
      direction,
      modules,
      batchSize,
      dryRun,
    };

    if (!isSupabaseServiceConfigured) {
      logger.warn('zoho_sync_supabase_not_configured', { route: 'full', direction, modules });
      const missingResult = {
        success: false,
        synced: 0,
        failed: 0,
        errors: ['Supabase configuration missing'],
        details: [],
      };

      return NextResponse.json({
        success: false,
        message: 'Supabase configuration missing. Full ZOHO sync is unavailable.',
        summary: {
          totalSynced: 0,
          totalFailed: 0,
          direction,
          modules,
        },
        results: {
          customers: { ...missingResult },
          products: { ...missingResult },
          orders: { ...missingResult },
        },
        errors: missingResult.errors,
      }, { status: 503 });
    }

    const results = await zohoSyncService.fullSync(options);

    // Calculate totals
    const totalSynced = Object.values(results).reduce((sum: number, r: any) => sum + (r?.synced || 0), 0);
    const totalFailed = Object.values(results).reduce((sum: number, r: any) => sum + (r?.failed || 0), 0);
    const allErrors = Object.values(results).flatMap((r: any) => r?.errors || []);

    return NextResponse.json({
      success: totalFailed === 0,
      message: totalFailed === 0
        ? `Full sync completed successfully! Synced ${totalSynced} items.`
        : `Full sync completed with ${totalFailed} failures. Synced ${totalSynced} items.`,
      summary: {
        totalSynced,
        totalFailed,
        direction,
        modules,
      },
      results: {
        customers: results.customers,
        products: results.products,
        orders: results.orders,
      },
      errors: allErrors,
    });
  } catch (error) {
    logger.error('Full sync API error', { error });
    return NextResponse.json(
      { error: 'Failed to perform full ZOHO sync' },
      { status: 500 }
    );
  }
}