/**
 * ZOHO CRM Integration Service
 * Syncs customers, contacts, leads, and deals with ZOHO CRM
 */

import { logger } from './logger';

export interface ZohoCRMConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface ZohoContact {
  id?: string;
  First_Name?: string;
  Last_Name: string;
  Email?: string;
  Phone?: string;
  Mobile?: string;
  Mailing_Street?: string;
  Mailing_City?: string;
  Mailing_State?: string;
  Mailing_Zip?: string;
  Mailing_Country?: string;
  Description?: string;
  Account_Name?: any;
}

export interface ZohoAccount {
  id?: string;
  Account_Name: string;
  Phone?: string;
  Email?: string;
  Website?: string;
  Billing_Street?: string;
  Billing_City?: string;
  Billing_State?: string;
  Billing_Code?: string;
  Billing_Country?: string;
  Description?: string;
}

export interface ZohoDeal {
  id?: string;
  Deal_Name: string;
  Amount: number;
  Stage: string;
  Closing_Date: string;
  Contact_Name?: any;
  Account_Name?: any;
  Description?: string;
}

export class ZohoCRMAPI {
  private config: ZohoCRMConfig;
  private baseURL = 'https://www.zohoapis.in/crm/v3'; // India datacenter

  constructor(config: ZohoCRMConfig) {
    this.config = config;
  }

  /**
   * Get OAuth 2.0 authorization URL
   */
  getAuthURL(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      scope: 'ZohoCRM.modules.ALL,ZohoCRM.settings.ALL',
      redirect_uri: this.config.redirectUri,
      access_type: 'offline',
    });

    return `https://accounts.zoho.in/oauth/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(code: string): Promise<{ access_token: string; refresh_token: string }> {
    const response = await fetch('https://accounts.zoho.in/oauth/v2/token', {
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
   * Refresh access token
   */
  async refreshAccessToken(): Promise<string> {
    if (!this.config.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('https://accounts.zoho.in/oauth/v2/token', {
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

    const url = `${this.baseURL}${endpoint}`;

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
      const error = await response.text();
      throw new Error(`ZOHO CRM API request failed: ${error}`);
    }

    return response.json();
  }

  // ==================== CONTACTS ====================

  /**
   * Get all contacts
   */
  async getContacts(page = 1, perPage = 200): Promise<any> {
    return this.apiRequest(`/Contacts?page=${page}&per_page=${perPage}`);
  }

  /**
   * Get contact by ID
   */
  async getContact(contactId: string): Promise<any> {
    return this.apiRequest(`/Contacts/${contactId}`);
  }

  /**
   * Search contacts by email
   */
  async searchContactByEmail(email: string): Promise<any> {
    const criteria = `(Email:equals:${email})`;
    return this.apiRequest(`/Contacts/search?criteria=${encodeURIComponent(criteria)}`);
  }

  /**
   * Create new contact
   */
  async createContact(contactData: ZohoContact): Promise<any> {
    return this.apiRequest('/Contacts', {
      method: 'POST',
      body: JSON.stringify({ data: [contactData] }),
    });
  }

  /**
   * Update existing contact
   */
  async updateContact(contactId: string, contactData: Partial<ZohoContact>): Promise<any> {
    return this.apiRequest(`/Contacts/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify({ data: [contactData] }),
    });
  }

  /**
   * Delete contact
   */
  async deleteContact(contactId: string): Promise<any> {
    return this.apiRequest(`/Contacts/${contactId}`, {
      method: 'DELETE',
    });
  }

  // ==================== ACCOUNTS ====================

  /**
   * Get all accounts
   */
  async getAccounts(page = 1, perPage = 200): Promise<any> {
    return this.apiRequest(`/Accounts?page=${page}&per_page=${perPage}`);
  }

  /**
   * Create new account
   */
  async createAccount(accountData: ZohoAccount): Promise<any> {
    return this.apiRequest('/Accounts', {
      method: 'POST',
      body: JSON.stringify({ data: [accountData] }),
    });
  }

  /**
   * Update existing account
   */
  async updateAccount(accountId: string, accountData: Partial<ZohoAccount>): Promise<any> {
    return this.apiRequest(`/Accounts/${accountId}`, {
      method: 'PUT',
      body: JSON.stringify({ data: [accountData] }),
    });
  }

  // ==================== DEALS ====================

  /**
   * Get all deals
   */
  async getDeals(page = 1, perPage = 200): Promise<any> {
    return this.apiRequest(`/Deals?page=${page}&per_page=${perPage}`);
  }

  /**
   * Create new deal
   */
  async createDeal(dealData: ZohoDeal): Promise<any> {
    return this.apiRequest('/Deals', {
      method: 'POST',
      body: JSON.stringify({ data: [dealData] }),
    });
  }

  /**
   * Update existing deal
   */
  async updateDeal(dealId: string, dealData: Partial<ZohoDeal>): Promise<any> {
    return this.apiRequest(`/Deals/${dealId}`, {
      method: 'PUT',
      body: JSON.stringify({ data: [dealData] }),
    });
  }
}

/**
 * Sync utility for CRM data
 */
export class ZohoCRMSync {
  private zohoAPI: ZohoCRMAPI;

  constructor(zohoAPI: ZohoCRMAPI) {
    this.zohoAPI = zohoAPI;
  }

  /**
   * Convert TecBunny customer to ZOHO Contact format
   */
  convertCustomerToContact(customer: any): ZohoContact {
    const nameParts = (customer.full_name || customer.name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || firstName;

    return {
      First_Name: firstName,
      Last_Name: lastName,
      Email: customer.email,
      Phone: customer.phone || customer.phone_number,
      Mobile: customer.mobile || customer.phone,
      Mailing_Street: customer.address_line1 || customer.street,
      Mailing_City: customer.city,
      Mailing_State: customer.state,
      Mailing_Zip: customer.postal_code || customer.zip_code || customer.pincode,
      Mailing_Country: customer.country || 'India',
      Description: `Customer ID: ${customer.id}`,
    };
  }

  /**
   * Convert TecBunny order to ZOHO Deal format
   */
  convertOrderToDeal(order: any): ZohoDeal {
    return {
      Deal_Name: `Order #${order.order_number || order.id}`,
      Amount: order.total_amount || order.total,
      Stage: this.mapOrderStatusToStage(order.status),
      Closing_Date: order.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      Description: `Order ID: ${order.id}\nItems: ${order.items?.length || 0}`,
    };
  }

  /**
   * Map order status to CRM deal stage
   */
  private mapOrderStatusToStage(status: string): string {
    const stageMap: Record<string, string> = {
      'pending': 'Qualification',
      'processing': 'Needs Analysis',
      'confirmed': 'Proposal/Price Quote',
      'shipped': 'Negotiation/Review',
      'delivered': 'Closed Won',
      'cancelled': 'Closed Lost',
      'refunded': 'Closed Lost',
    };

    return stageMap[status?.toLowerCase()] || 'Qualification';
  }

  /**
   * Sync customer to ZOHO CRM
   */
  async syncCustomerToZoho(customer: any): Promise<{ success: boolean; zohoId?: string; error?: string }> {
    try {
      const contactData = this.convertCustomerToContact(customer);

      // Check if contact already exists
      if (customer.email) {
        try {
          const existing = await this.zohoAPI.searchContactByEmail(customer.email);
          if (existing.data && existing.data.length > 0) {
            // Update existing contact
            const _result = await this.zohoAPI.updateContact(existing.data[0].id, contactData);
            return { success: true, zohoId: existing.data[0].id };
          }
        } catch (_error) {
          // Contact doesn't exist, create new one
        }
      }

      // Create new contact
      const result = await this.zohoAPI.createContact(contactData);
      const zohoId = result.data?.[0]?.details?.id;

      return { success: true, zohoId };
    } catch (error) {
      logger.error('Failed to sync customer to ZOHO CRM', { error, customer });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Sync order to ZOHO CRM as Deal
   */
  async syncOrderToZoho(order: any, customerZohoId?: string): Promise<{ success: boolean; zohoId?: string; error?: string }> {
    try {
      const dealData = this.convertOrderToDeal(order);

      // Link to contact if available
      if (customerZohoId) {
        dealData.Contact_Name = { id: customerZohoId };
      }

      const result = await this.zohoAPI.createDeal(dealData);
      const zohoId = result.data?.[0]?.details?.id;

      return { success: true, zohoId };
    } catch (error) {
      logger.error('Failed to sync order to ZOHO CRM', { error, order });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Create default CRM service instance
const crmConfig: ZohoCRMConfig = {
  clientId: process.env.ZOHO_CLIENT_ID || '',
  clientSecret: process.env.ZOHO_CLIENT_SECRET || '',
  redirectUri: process.env.ZOHO_REDIRECT_URI || '',
  accessToken: process.env.ZOHO_ACCESS_TOKEN,
  refreshToken: process.env.ZOHO_REFRESH_TOKEN,
};

export const zohoCRMAPI = new ZohoCRMAPI(crmConfig);
export const zohoCRMSync = new ZohoCRMSync(zohoCRMAPI);
