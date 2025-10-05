import { NextRequest, NextResponse } from 'next/server';

import { ZohoInventoryAPI, ZohoInventorySync } from '../../../../lib/zoho-inventory';
import { createClient } from '../../../../lib/supabase';
import { logger } from '../../../../lib/logger';

const zohoConfig = {
  clientId: process.env.ZOHO_CLIENT_ID!,
  clientSecret: process.env.ZOHO_CLIENT_SECRET!,
  redirectUri: process.env.ZOHO_REDIRECT_URI!,
  organizationId: process.env.ZOHO_ORGANIZATION_ID!,
  accessToken: process.env.ZOHO_ACCESS_TOKEN,
  refreshToken: process.env.ZOHO_REFRESH_TOKEN,
};

/**
 * GET /api/zoho/stock
 * Get stock sync status
 */
export async function GET(_request: NextRequest) {
  try {
    // Check if access tokens are available
    if (!zohoConfig.accessToken) {
      return NextResponse.json({
        status: 'not_configured',
        message: 'Zoho authentication required',
        configured: false
      });
    }

    return NextResponse.json({
      status: 'configured',
      message: 'Stock management ready',
      configured: true
    });
  } catch (error) {
    logger.error('Error checking stock status:', { error });
    return NextResponse.json(
      { error: 'Failed to check stock status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/zoho/stock/adjust
 * Adjust stock quantity in both TecBunny and Zoho
 */
export async function POST(request: NextRequest) {
  try {
    const { productId, quantity, reason } = await request.json();
    
    if (!productId || quantity === undefined) {
      return NextResponse.json(
        { error: 'Product ID and quantity are required' },
        { status: 400 }
      );
    }
    
    const supabase = createClient();
    const zohoAPI = new ZohoInventoryAPI(zohoConfig);
    const zohoSync = new ZohoInventorySync(zohoAPI);
    
    // Get product info including Zoho item ID
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();
    
    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // Update local database first
    const { error: updateError } = await supabase
      .from('products')
      .update({ stock_quantity: quantity })
      .eq('id', productId);
    
    if (updateError) {
      throw new Error(`Failed to update local stock: ${updateError.message}`);
    }
    
    // Record stock movement locally
    const { error: movementError } = await supabase
      .from('stock_movements')
      .insert({
        product_id: productId,
        movement_type: quantity > (product.stock_quantity || 0) ? 'in' : 'out',
        quantity: Math.abs(quantity - (product.stock_quantity || 0)),
        reason: reason || 'Stock adjustment via Zoho sync',
        created_at: new Date().toISOString()
      });
    
    if (movementError) {
      logger.warn('Failed to record stock movement:', { error: movementError });
    }
    
    // Sync to Zoho if Zoho item ID exists
    let zohoResult = null;
    if (product.zoho_item_id) {
      try {
        zohoResult = await zohoSync.syncStockToZoho(
          product.zoho_item_id,
          quantity,
          reason || 'Stock adjustment from TecBunny Store'
        );
      } catch (zohoError) {
        logger.warn('Failed to sync to Zoho:', { error: zohoError });
        // Don't fail the entire operation if Zoho sync fails
        zohoResult = { error: zohoError instanceof Error ? zohoError.message : String(zohoError) };
      }
    }
    
    return NextResponse.json({
      message: 'Stock updated successfully',
      local_update: true,
      zoho_sync: product.zoho_item_id ? zohoResult : 'No Zoho item ID',
      new_quantity: quantity
    });
    
  } catch (error) {
    logger.error('Error adjusting stock:', { error });
    return NextResponse.json(
      { error: `Failed to adjust stock: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}