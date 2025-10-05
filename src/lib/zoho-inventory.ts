/**
 * Zoho Inventory Integration for TecBunny Store
 * Complete API wrapper and sync functionality
 */

import { logger } from './logger';

export interface ZohoConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  organizationId: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface ZohoProduct {
  item_id?: string;
  name: string;
  sku?: string;
  description?: string;
  rate: number;
  initial_stock?: number;
  initial_stock_rate?: number;
  vendor_id?: string;
  tax_id?: string;
  purchase_account_id?: string;
  inventory_account_id?: string;
  package_details?: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };
  custom_fields?: Array<{
    customfield_id: string;
    value: string;
  }>;
}

export interface ZohoStockAdjustment {
  adjustment_type: 'quantity' | 'value';
  reason: string;
  adjustment_date: string;
  line_items: Array<{
    item_id: string;
    quantity_adjusted: number;
    warehouse_id?: string;
  }>;
}

export class ZohoInventoryAPI {
  private config: ZohoConfig;
  private baseURL = 'https://www.zohoapis.in/inventory/v1'; // India datacenter
  
  constructor(config: ZohoConfig) {
    this.config = config;
  }

  /**
   * Get OAuth 2.0 authorization URL
   */
  getAuthURL(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      scope: 'ZohoInventory.FullAccess.all',
      redirect_uri: this.config.redirectUri,
      access_type: 'offline',
    });

    return `https://accounts.zoho.in/oauth/v2/auth?${params.toString()}`; // India datacenter
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(code: string): Promise<{ access_token: string; refresh_token: string }> {
    const response = await fetch('https://accounts.zoho.in/oauth/v2/token', { // India datacenter
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        code,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data = await response.json();
    this.config.accessToken = data.access_token;
    this.config.refreshToken = data.refresh_token;
    
    return data;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<string> {
    if (!this.config.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('https://accounts.zoho.in/oauth/v2/token', { // India datacenter
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: this.config.refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`);
    }

    const data = await response.json();
    this.config.accessToken = data.access_token;
    
    return data.access_token;
  }

  /**
   * Make authenticated API request
   */
  private async apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.config.accessToken) {
      throw new Error('No access token. Please authenticate first.');
    }

    const url = `${this.baseURL}${endpoint}?organization_id=${this.config.organizationId}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Zoho-oauthtoken ${this.config.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Handle token refresh if needed
    if (response.status === 401) {
      await this.refreshAccessToken();
      return this.apiRequest(endpoint, options);
    }

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Zoho API Error: ${response.status} ${response.statusText} - ${errorData}`);
    }

    return response.json();
  }

  /**
   * Get all items from Zoho Inventory
   */
  async getItems(page = 1, perPage = 200): Promise<any> {
    return this.apiRequest(`/items?page=${page}&per_page=${perPage}`);
  }

  /**
   * Get specific item by ID
   */
  async getItem(itemId: string): Promise<any> {
    return this.apiRequest(`/items/${itemId}`);
  }

  /**
   * Create new item in Zoho Inventory
   */
  async createItem(itemData: ZohoProduct): Promise<any> {
    return this.apiRequest('/items', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
  }

  /**
   * Update existing item
   */
  async updateItem(itemId: string, itemData: Partial<ZohoProduct>): Promise<any> {
    return this.apiRequest(`/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(itemData),
    });
  }

  /**
   * Delete item
   */
  async deleteItem(itemId: string): Promise<any> {
    return this.apiRequest(`/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Adjust stock quantity
   */
  async adjustStock(adjustmentData: ZohoStockAdjustment): Promise<any> {
    return this.apiRequest('/inventoryadjustments', {
      method: 'POST',
      body: JSON.stringify(adjustmentData),
    });
  }

  /**
   * Get stock summary for an item
   */
  async getStockSummary(itemId: string): Promise<any> {
    return this.apiRequest(`/items/${itemId}/stock`);
  }

  /**
   * Get all warehouses
   */
  async getWarehouses(): Promise<any> {
    return this.apiRequest('/warehouses');
  }
}

/**
 * Utility functions for syncing with local database
 */
export class ZohoInventorySync {
  private zohoAPI: ZohoInventoryAPI;
  
  constructor(zohoAPI: ZohoInventoryAPI) {
    this.zohoAPI = zohoAPI;
  }

  /**
   * Convert TecBunny product to Zoho format
   */
  convertToZohoFormat(product: any): ZohoProduct {
    return {
      name: product.name,
      sku: product.sku || product.id,
      description: product.description || '',
      rate: parseFloat(product.price) || 0,
      initial_stock: parseInt(product.stock_quantity) || 0,
      initial_stock_rate: parseFloat(product.price) || 0,
      custom_fields: [
        {
          customfield_id: 'tecbunny_id',
          value: product.id.toString()
        }
      ]
    };
  }

  /**
   * Convert Zoho item to TecBunny format
   */
  convertFromZohoFormat(zohoItem: any): any {
    return {
      id: zohoItem.custom_fields?.find((cf: any) => cf.customfield_id === 'tecbunny_id')?.value || zohoItem.sku,
      name: zohoItem.name,
      sku: zohoItem.sku,
      description: zohoItem.description,
      price: zohoItem.rate,
      stock_quantity: zohoItem.stock_on_hand || 0,
      zoho_item_id: zohoItem.item_id
    };
  }

  /**
   * Convert TecBunny order to ZOHO Sales Order format
   */
  convertOrderToZoho(order: any): any {
    return {
      customer_id: order.customer?.zoho_crm_id || '',
      salesorder_number: order.id?.toString() || '',
      date: order.created_at ? new Date(order.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      shipment_date: order.updated_at ? new Date(order.updated_at).toISOString().split('T')[0] : undefined,
      line_items: order.items?.map((item: any) => ({
        item_id: item.product?.zoho_item_id || '',
        name: item.product?.name || item.name || '',
        rate: parseFloat(item.price) || 0,
        quantity: parseInt(item.quantity) || 1,
        discount: parseFloat(item.discount || '0'),
      })) || [],
      notes: order.notes || '',
      terms: order.terms || '',
      shipping_charge: parseFloat(order.shipping_cost || '0'),
      adjustment: parseFloat(order.adjustment || '0'),
      adjustment_description: order.adjustment_description || '',
      custom_fields: [
        {
          customfield_id: 'tecbunny_order_id',
          value: order.id?.toString() || ''
        }
      ]
    };
  }

  /**
   * Sync single product to Zoho
   */
  async syncProductToZoho(product: any): Promise<any> {
    try {
      const zohoProduct = this.convertToZohoFormat(product);
      
      // Check if item already exists in Zoho
      if (product.zoho_item_id) {
        return await this.zohoAPI.updateItem(product.zoho_item_id, zohoProduct);
      } else {
        return await this.zohoAPI.createItem(zohoProduct);
      }
    } catch (error) {
      logger.error('Error syncing product to Zoho:', { error });
      throw error;
    }
  }

  /**
   * Sync stock quantity to Zoho
   */
  async syncStockToZoho(productId: string, newQuantity: number, reason = 'Stock adjustment from TecBunny Store'): Promise<any> {
    try {
      // Get current stock from Zoho
      const stockSummary = await this.zohoAPI.getStockSummary(productId);
      const currentStock = stockSummary.stock_on_hand || 0;
      const adjustment = newQuantity - currentStock;

      if (adjustment === 0) {
        return { message: 'No adjustment needed' };
      }

      const adjustmentData: ZohoStockAdjustment = {
        adjustment_type: 'quantity',
        reason,
        adjustment_date: new Date().toISOString().split('T')[0] || new Date().toISOString(),
        line_items: [{
          item_id: productId,
          quantity_adjusted: adjustment
        }]
      };

      return await this.zohoAPI.adjustStock(adjustmentData);
    } catch (error) {
      logger.error('Error syncing stock to Zoho:', { error });
      throw error;
    }
  }

  /**
   * Bulk sync all products to Zoho
   */
  async syncAllProductsToZoho(products: any[]): Promise<{ success: any[]; errors: any[] }> {
    const results: {
      success: Array<{ product: string; result: any }>;
      errors: Array<{ product: string; error: string }>;
    } = { success: [], errors: [] };
    
    for (const product of products) {
      try {
        const result = await this.syncProductToZoho(product);
        results.success.push({ product: product.id, result });
        
        // Rate limiting - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.errors.push({ 
          product: product.id, 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  /**
   * Sync products from Zoho to local database
   */
  async syncProductsFromZoho(): Promise<any[]> {
    try {
      const zohoItems = await this.zohoAPI.getItems();
      return zohoItems.items.map((item: any) => this.convertFromZohoFormat(item));
    } catch (error) {
      logger.error('Error syncing products from Zoho:', { error });
      throw error;
    }
  }
}
