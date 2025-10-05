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
 * GET /api/zoho/sync
 * Get sync status and statistics
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check if access tokens are available
    if (!zohoConfig.accessToken) {
      return NextResponse.json({
        error: 'Zoho not configured',
        message: 'Please complete Zoho OAuth authentication first',
        local_products: 0,
        zoho_items: 0,
        sync_status: 'not_configured',
        last_sync: null
      });
    }
    
    const zohoAPI = new ZohoInventoryAPI(zohoConfig);
    
    // Get local products count
    const { count: localCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    
    // Get Zoho items count
    try {
      const zohoItems = await zohoAPI.getItems(1, 1);
      const zohoCount = zohoItems.page_context?.total || 0;
      
      return NextResponse.json({
        local_products: localCount,
        zoho_items: zohoCount,
        sync_status: 'ready',
        last_sync: null // You can store this in your database
      });
    } catch (zohoError) {
      logger.warn('Failed to fetch Zoho items during sync status', { error: zohoError });
      return NextResponse.json({
        local_products: localCount,
        zoho_items: 0,
        sync_status: 'connection_error',
        last_sync: null,
        error: 'Failed to connect to Zoho API'
      });
    }
  } catch (error) {
    logger.error('Error getting sync status:', { error });
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/zoho/sync
 * Sync products between TecBunny and Zoho
 */
export async function POST(request: NextRequest) {
  try {
    const { direction, productIds } = await request.json();
    
    const supabase = createClient();
    const zohoAPI = new ZohoInventoryAPI(zohoConfig);
    const zohoSync = new ZohoInventorySync(zohoAPI);
    
    if (direction === 'to_zoho') {
      // Sync from TecBunny to Zoho
      let query = supabase.from('products').select('*');
      
      if (productIds && productIds.length > 0) {
        query = query.in('id', productIds);
      }
      
      const { data: products, error } = await query;
      
      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
      
      if (!products || products.length === 0) {
        return NextResponse.json({
          message: 'No products found to sync',
          success: [],
          errors: []
        });
      }
      
      const results = await zohoSync.syncAllProductsToZoho(products);
      
      // Update local database with Zoho item IDs
      for (const success of results.success) {
        if (success.result?.item?.item_id) {
          await supabase
            .from('products')
            .update({ zoho_item_id: success.result.item.item_id })
            .eq('id', success.product);
        }
      }
      
      return NextResponse.json({
        message: `Synced ${results.success.length} products to Zoho`,
        success: results.success,
        errors: results.errors
      });
      
    } else if (direction === 'from_zoho') {
      // Sync from Zoho to TecBunny
      const zohoProducts = await zohoSync.syncProductsFromZoho();
      
      const results: {
        success: Array<{ product: string }>;
        errors: Array<{ product: string; error: string }>;
      } = { success: [], errors: [] };
      
      for (const product of zohoProducts) {
        try {
          const { error } = await supabase
            .from('products')
            .upsert({
              id: product.id,
              name: product.name,
              sku: product.sku,
              description: product.description,
              price: product.price,
              stock_quantity: product.stock_quantity,
              zoho_item_id: product.zoho_item_id
            }, {
              onConflict: 'id'
            });
          
          if (error) {
            results.errors.push({ product: product.id, error: error.message });
          } else {
            results.success.push({ product: product.id });
          }
        } catch (error) {
          results.errors.push({ 
            product: product.id, 
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      return NextResponse.json({
        message: `Synced ${results.success.length} products from Zoho`,
        success: results.success,
        errors: results.errors
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid sync direction. Use "to_zoho" or "from_zoho"' },
      { status: 400 }
    );
    
  } catch (error) {
    logger.error('Error syncing with Zoho:', { error });
    return NextResponse.json(
      { error: `Sync failed: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}