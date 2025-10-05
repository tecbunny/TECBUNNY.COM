import { NextRequest, NextResponse } from 'next/server';

import { zohoSyncService } from '../../../../../lib/zoho-sync-service';
import { logger } from '../../../../../lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/zoho/sync/products
 * Sync products to/from ZOHO Inventory
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { 
      direction = 'to_zoho', // 'to_zoho' | 'from_zoho' | 'bidirectional'
      productIds,
      batchSize = 50 
    } = body;

    logger.info('Starting product sync', { direction });

    let result;

    if (direction === 'from_zoho') {
      result = await zohoSyncService.syncProductsFromZoho({ batchSize });
    } else if (direction === 'bidirectional') {
      const toZoho = await zohoSyncService.syncProductsToZoho({ productIds, batchSize });
      const fromZoho = await zohoSyncService.syncProductsFromZoho({ batchSize });
      
      result = {
        success: toZoho.success && fromZoho.success,
        synced: toZoho.synced + fromZoho.synced,
        failed: toZoho.failed + fromZoho.failed,
        errors: [...toZoho.errors, ...fromZoho.errors],
        toZoho,
        fromZoho,
      };
    } else {
      result = await zohoSyncService.syncProductsToZoho({ productIds, batchSize });
    }

    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? `Successfully synced ${result.synced} products`
        : 'Product sync completed with errors',
      direction,
      synced: result.synced,
      failed: result.failed,
      errors: result.errors,
      details: result.details,
    });
  } catch (error) {
    logger.error('Product sync API error', { error });
    return NextResponse.json(
      { error: 'Failed to sync products with ZOHO Inventory' },
      { status: 500 }
    );
  }
}