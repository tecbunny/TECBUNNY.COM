/**
 * ZOHO Token Manager
 * Secure token storage and automatic refresh
 */

import { createClient } from '@supabase/supabase-js';

import { logger } from './logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export class ZohoTokenManager {
  private supabase = createClient(supabaseUrl, supabaseKey);
  private cachedTokens: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
  } = {};

  /**
   * Get access token (from cache or database)
   */
  async getAccessToken(): Promise<string | null> {
    // Return cached token if still valid
    if (this.cachedTokens.accessToken && this.cachedTokens.expiresAt) {
      if (new Date() < this.cachedTokens.expiresAt) {
        return this.cachedTokens.accessToken;
      }
    }

    // Fetch from database
    const { data, error } = await this.supabase
      .from('zoho_config')
      .select('config_value, expires_at')
      .eq('config_key', 'access_token')
      .single();

    if (error || !data) {
      logger.warn('No access token found in database');
      return null;
    }

    // Check if token is expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      logger.info('Access token expired, attempting refresh');
      return await this.refreshToken();
    }

    this.cachedTokens.accessToken = data.config_value;
    this.cachedTokens.expiresAt = data.expires_at ? new Date(data.expires_at) : undefined;

    return data.config_value;
  }

  /**
   * Get refresh token from database
   */
  async getRefreshToken(): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('zoho_config')
      .select('config_value')
      .eq('config_key', 'refresh_token')
      .single();

    if (error || !data) {
      logger.warn('No refresh token found in database');
      return null;
    }

    return data.config_value;
  }

  /**
   * Store tokens in database
   */
  async storeTokens(accessToken: string, refreshToken?: string, expiresIn = 3600): Promise<void> {
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    try {
      // Store access token
      await this.supabase
        .from('zoho_config')
        .update({
          config_value: accessToken,
          updated_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString()
        })
        .eq('config_key', 'access_token');

      // Store refresh token if provided
      if (refreshToken) {
        await this.supabase
          .from('zoho_config')
          .update({
            config_value: refreshToken,
            updated_at: new Date().toISOString()
          })
          .eq('config_key', 'refresh_token');
      }

      // Update cache
      this.cachedTokens = {
        accessToken,
        refreshToken: refreshToken || this.cachedTokens.refreshToken,
        expiresAt
      };

      logger.info('ZOHO tokens stored successfully');
    } catch (error) {
      logger.error('Error storing ZOHO tokens', { error });
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<string | null> {
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) {
      logger.error('Cannot refresh token: no refresh token available');
      return null;
    }

    const { data: clientData } = await this.supabase
      .from('zoho_config')
      .select('config_key, config_value')
      .in('config_key', ['client_id', 'client_secret']);

    const clientId = clientData?.find((c: any) => c.config_key === 'client_id')?.config_value;
    const clientSecret = clientData?.find((c: any) => c.config_key === 'client_secret')?.config_value;

    if (!clientId || !clientSecret) {
      logger.error('Missing client credentials for token refresh');
      return null;
    }

    try {
      const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Token refresh failed', { status: response.status, error: errorText });
        return null;
      }

      const data = await response.json();
      await this.storeTokens(data.access_token, undefined, data.expires_in || 3600);

      logger.info('Access token refreshed successfully');
      return data.access_token;
    } catch (error) {
      logger.error('Error refreshing token', { error });
      return null;
    }
  }

  /**
   * Store ZOHO configuration (client ID, secret, org ID)
   */
  async storeConfig(config: {
    clientId?: string;
    clientSecret?: string;
    organizationId?: string;
  }): Promise<void> {
    const updates = [];

    if (config.clientId) {
      updates.push(
        this.supabase
          .from('zoho_config')
          .update({ config_value: config.clientId })
          .eq('config_key', 'client_id')
      );
    }

    if (config.clientSecret) {
      updates.push(
        this.supabase
          .from('zoho_config')
          .update({ config_value: config.clientSecret, encrypted: true })
          .eq('config_key', 'client_secret')
      );
    }

    if (config.organizationId) {
      updates.push(
        this.supabase
          .from('zoho_config')
          .update({ config_value: config.organizationId })
          .eq('config_key', 'organization_id')
      );
    }

    try {
      await Promise.all(updates);
      logger.info('ZOHO configuration stored successfully');
    } catch (error) {
      logger.error('Error storing ZOHO configuration', { error });
      throw error;
    }
  }

  /**
   * Get ZOHO configuration
   */
  async getConfig(): Promise<{
    clientId?: string;
    clientSecret?: string;
    organizationId?: string;
  }> {
    const { data, error } = await this.supabase
      .from('zoho_config')
      .select('config_key, config_value')
      .in('config_key', ['client_id', 'client_secret', 'organization_id']);

    if (error || !data) {
      logger.warn('No ZOHO configuration found');
      return {};
    }

    return {
      clientId: data.find(c => c.config_key === 'client_id')?.config_value,
      clientSecret: data.find(c => c.config_key === 'client_secret')?.config_value,
      organizationId: data.find(c => c.config_key === 'organization_id')?.config_value,
    };
  }

  /**
   * Clear all cached tokens (logout)
   */
  clearCache(): void {
    this.cachedTokens = {};
    logger.info('ZOHO token cache cleared');
  }

  /**
   * Check if ZOHO is configured and authenticated
   */
  async isConfigured(): Promise<boolean> {
    const config = await this.getConfig();
    const accessToken = await this.getAccessToken();
    
    return !!(config.clientId && config.organizationId && accessToken);
  }
}

// Export singleton instance
export const zohoTokenManager = new ZohoTokenManager();
