/**
 * Comprehensive ZOHO Sync Service
 * Syncs CRM (Customers, Contacts) and Inventory (Products, Orders, Sales)
 */

import { zohoCRMSync } from './zoho-crm';
import { ZohoInventoryAPI, ZohoInventorySync } from './zoho-inventory';
import { logger } from './logger';
import { createServiceClient, isSupabaseServiceConfigured } from './supabase/server';

const supabase = createServiceClient();

// Initialize APIs
const inventoryConfig = {
  clientId: process.env.ZOHO_CLIENT_ID!,
  clientSecret: process.env.ZOHO_CLIENT_SECRET!,
  redirectUri: process.env.ZOHO_REDIRECT_URI!,
  organizationId: process.env.ZOHO_ORGANIZATION_ID!,
  accessToken: process.env.ZOHO_ACCESS_TOKEN,
  refreshToken: process.env.ZOHO_REFRESH_TOKEN,
};

const zohoInventoryAPI = new ZohoInventoryAPI(inventoryConfig);
const zohoInventorySync = new ZohoInventorySync(zohoInventoryAPI);

const SUPABASE_CONFIG_MISSING_ERROR = 'Supabase configuration missing';

function ensureSupabaseConfigured(operation: string): boolean {
  if (!isSupabaseServiceConfigured) {
    logger.warn('zoho_sync_service.supabase_not_configured', { operation });
    return false;
  }

  return true;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
  details?: any[];
}

function createMissingConfigResult(): SyncResult {
  return {
    success: false,
    synced: 0,
    failed: 0,
    errors: [SUPABASE_CONFIG_MISSING_ERROR],
    details: [],
  };
}

export interface SyncOptions {
  direction: 'to_zoho' | 'from_zoho' | 'bidirectional';
  modules: ('crm' | 'inventory' | 'products' | 'orders' | 'customers')[];
  batchSize?: number;
  dryRun?: boolean;
}

/**
 * Main ZOHO Sync Service
 */
export class ZohoSyncService {
  /**
   * Sync all customers to ZOHO CRM
   */
  async syncCustomersToZoho(options: { batchSize?: number } = {}): Promise<SyncResult> {
    if (!ensureSupabaseConfigured('syncCustomersToZoho')) {
      return createMissingConfigResult();
    }

    const batchSize = options.batchSize || 50;
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
      details: [],
    };

    try {
      logger.info('Starting customer sync to ZOHO CRM');

      // Get all customers from database
      const { data: customers, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!customers || customers.length === 0) {
        logger.info('No customers to sync');
        return result;
      }

      logger.info(`Found ${customers.length} customers to sync`);

      // Sync in batches
      for (let i = 0; i < customers.length; i += batchSize) {
        const batch = customers.slice(i, i + batchSize);

        for (const customer of batch) {
          try {
            const syncResult = await zohoCRMSync.syncCustomerToZoho(customer);

            if (syncResult.success) {
              result.synced++;

              // Update local database with ZOHO ID
              if (syncResult.zohoId) {
                await supabase
                  .from('profiles')
                  .update({
                    zoho_crm_id: syncResult.zohoId,
                    zoho_synced_at: new Date().toISOString(),
                  })
                  .eq('id', customer.id);
              }

              result.details?.push({
                id: customer.id,
                email: customer.email,
                zohoId: syncResult.zohoId,
                status: 'synced',
              });
            } else {
              result.failed++;
              result.errors.push(`Failed to sync customer ${customer.email}: ${syncResult.error}`);
            }
          } catch (error) {
            result.failed++;
            const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
            result.errors.push(`Error syncing customer ${customer.email}: ${errorMsg}`);
            logger.error('Customer sync error', { error, customer: customer.email });
          }
        }

        // Small delay between batches
        if (i + batchSize < customers.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      logger.info('Customer sync completed', { synced: result.synced, failed: result.failed });
    } catch (error) {
      result.success = false;
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      result.errors.push(`Customer sync failed: ${errorMsg}`);
      logger.error('Customer sync failed', { error });
    }

    return result;
  }

  /**
   * Sync all products to ZOHO Inventory
   */
  async syncProductsToZoho(options: { productIds?: number[]; batchSize?: number } = {}): Promise<SyncResult> {
    if (!ensureSupabaseConfigured('syncProductsToZoho')) {
      return createMissingConfigResult();
    }

    const batchSize = options.batchSize || 50;
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
      details: [],
    };

    try {
      logger.info('Starting product sync to ZOHO Inventory');

      // Build query
      let query = supabase
        .from('products')
        .select('*');

      // Filter by specific product IDs if provided
      if (options.productIds && options.productIds.length > 0) {
        query = query.in('id', options.productIds);
      }

      const { data: products, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      if (!products || products.length === 0) {
        logger.info('No products to sync');
        return result;
      }

      logger.info(`Found ${products.length} products to sync`);

      // Sync in batches
      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);

        for (const product of batch) {
          try {
            const zohoProduct = zohoInventorySync.convertToZohoFormat(product);

            let zohoItemId: string;

            // Check if product already exists in ZOHO
            if (product.zoho_item_id) {
              // Update existing product
              await zohoInventoryAPI.updateItem(product.zoho_item_id, zohoProduct);
              zohoItemId = product.zoho_item_id;
            } else {
              // Create new product
              const response = await zohoInventoryAPI.createItem(zohoProduct);
              zohoItemId = response.item?.item_id;

              // Update local database with ZOHO ID
              if (zohoItemId) {
                await supabase
                  .from('products')
                  .update({
                    zoho_item_id: zohoItemId,
                    zoho_synced_at: new Date().toISOString(),
                  })
                  .eq('id', product.id);
              }
            }

            result.synced++;
            result.details?.push({
              id: product.id,
              name: product.name,
              zohoId: zohoItemId,
              status: 'synced',
            });
          } catch (error) {
            result.failed++;
            const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
            result.errors.push(`Failed to sync product ${product.name}: ${errorMsg}`);
            logger.error('Product sync error', { error, product: product.name });
          }
        }

        // Small delay between batches
        if (i + batchSize < products.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      logger.info('Product sync completed', { synced: result.synced, failed: result.failed });
    } catch (error) {
      result.success = false;
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      result.errors.push(`Product sync failed: ${errorMsg}`);
      logger.error('Product sync failed', { error });
    }

    return result;
  }

  /**
   * Sync orders to ZOHO Inventory as Sales Orders
   */
  async syncOrdersToZoho(options: { orderIds?: number[]; batchSize?: number } = {}): Promise<SyncResult> {
    if (!ensureSupabaseConfigured('syncOrdersToZoho')) {
      return createMissingConfigResult();
    }

    const batchSize = options.batchSize || 50;
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
      details: [],
    };

    try {
      logger.info('Starting order sync to ZOHO Inventory');

      // Build query
      let query = supabase
        .from('orders')
        .select(`
          *,
          items:order_items(
            *,
            product:products(*)
          ),
          customer:profiles(*)
        `);

      // Filter by specific order IDs if provided
      if (options.orderIds && options.orderIds.length > 0) {
        query = query.in('id', options.orderIds);
      }

      const { data: orders, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      if (!orders || orders.length === 0) {
        logger.info('No orders to sync');
        return result;
      }

      logger.info(`Found ${orders.length} orders to sync`);

      // Sync in batches
      for (let i = 0; i < orders.length; i += batchSize) {
        const batch = orders.slice(i, i + batchSize);

        for (const order of batch) {
          try {
            // First, sync customer to CRM if not already synced
            let customerZohoId = order.customer?.zoho_crm_id;
            if (order.customer && !customerZohoId) {
              const customerSync = await zohoCRMSync.syncCustomerToZoho(order.customer);
              customerZohoId = customerSync.zohoId;
            }

            // Convert order to ZOHO Sales Order format
            const zohoSalesOrder = zohoInventorySync.convertOrderToZoho(order);

            let zohoOrderId: string;

            // Check if order already exists in ZOHO
            if (order.zoho_order_id) {
              // Update existing order
              await zohoInventoryAPI.updateItem(order.zoho_order_id, zohoSalesOrder);
              zohoOrderId = order.zoho_order_id;
            } else {
              // Create new sales order
              const response = await zohoInventoryAPI.createItem(zohoSalesOrder);
              zohoOrderId = response.salesorder?.salesorder_id;

              // Update local database with ZOHO ID
              if (zohoOrderId) {
                await supabase
                  .from('orders')
                  .update({
                    zoho_order_id: zohoOrderId,
                    zoho_synced_at: new Date().toISOString(),
                  })
                  .eq('id', order.id);
              }
            }

            // Also create/update deal in CRM
            if (customerZohoId) {
              await zohoCRMSync.syncOrderToZoho(order, customerZohoId);
            }

            result.synced++;
            result.details?.push({
              id: order.id,
              orderNumber: order.order_number,
              zohoId: zohoOrderId,
              status: 'synced',
            });
          } catch (error) {
            result.failed++;
            result.errors.push(`Failed to sync order ${order.order_number}: ${error}`);
            logger.error('Order sync error', { error, order: order.order_number });
          }
        }

        // Small delay between batches
        if (i + batchSize < orders.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      logger.info('Order sync completed', { synced: result.synced, failed: result.failed });
    } catch (error) {
      result.success = false;
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      result.errors.push(`Order sync failed: ${errorMsg}`);
      logger.error('Order sync failed', { error });
    }

    return result;
  }

  /**
   * Sync products FROM ZOHO to local database
   */
  async syncProductsFromZoho(_options: { batchSize?: number } = {}): Promise<SyncResult> {
    if (!ensureSupabaseConfigured('syncProductsFromZoho')) {
      return createMissingConfigResult();
    }

    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
      details: [],
    };

    try {
      logger.info('Starting product sync FROM ZOHO');

      const zohoItems = await zohoInventoryAPI.getItems();
      
      if (!zohoItems.items || zohoItems.items.length === 0) {
        logger.info('No products in ZOHO to sync');
        return result;
      }

      logger.info(`Found ${zohoItems.items.length} products in ZOHO`);

      for (const zohoItem of zohoItems.items) {
        try {
          const localProduct = zohoInventorySync.convertFromZohoFormat(zohoItem);

          // Check if product exists locally
          const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('zoho_item_id', zohoItem.item_id)
            .single();

          if (existing) {
            // Update existing product
            await supabase
              .from('products')
              .update({
                ...localProduct,
                zoho_synced_at: new Date().toISOString(),
              })
              .eq('id', existing.id);
          } else {
            // Create new product
            await supabase
              .from('products')
              .insert({
                ...localProduct,
                zoho_item_id: zohoItem.item_id,
                zoho_synced_at: new Date().toISOString(),
              });
          }

          result.synced++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Failed to sync product from ZOHO ${zohoItem.name}: ${error}`);
        }
      }

      logger.info('Product sync from ZOHO completed', { synced: result.synced, failed: result.failed });
    } catch (error) {
      result.success = false;
      result.errors.push(`Product sync from ZOHO failed: ${error}`);
      logger.error('Product sync from ZOHO failed', { error });
    }

    return result;
  }

  /**
   * Full bidirectional sync
   */
  async fullSync(options: SyncOptions): Promise<{
    customers?: SyncResult;
    products?: SyncResult;
    orders?: SyncResult;
  }> {
    if (!ensureSupabaseConfigured('fullSync')) {
      const missing = createMissingConfigResult();
      return {
        customers: { ...missing },
        products: { ...missing },
        orders: { ...missing },
      };
    }

    const results: any = {};

    try {
      logger.info('Starting full ZOHO sync', { options });

      // Sync customers to CRM
      if (options.modules.includes('crm') || options.modules.includes('customers')) {
        results.customers = await this.syncCustomersToZoho({ batchSize: options.batchSize });
      }

      // Sync products
      if (options.modules.includes('inventory') || options.modules.includes('products')) {
        if (options.direction === 'to_zoho' || options.direction === 'bidirectional') {
          results.products = await this.syncProductsToZoho({ batchSize: options.batchSize });
        }
        if (options.direction === 'from_zoho' || options.direction === 'bidirectional') {
          const fromZohoResult = await this.syncProductsFromZoho({ batchSize: options.batchSize });
          results.products = results.products || fromZohoResult;
        }
      }

      // Sync orders
      if (options.modules.includes('inventory') || options.modules.includes('orders')) {
        results.orders = await this.syncOrdersToZoho({ batchSize: options.batchSize });
      }

      logger.info('Full ZOHO sync completed', { results });
    } catch (error) {
      logger.error('Full ZOHO sync failed', { error });
    }

    return results;
  }
}

// Export singleton instance
export const zohoSyncService = new ZohoSyncService();
