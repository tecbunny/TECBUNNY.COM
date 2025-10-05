/**
 * Superfone Enterprise API Integration
 * Complete implementation of Superfone's enterprise features
 * Based on Enterprise Plan API Documentation
 */

import https from 'https';

import { logger, LogMeta } from './logger';

// Enterprise Superfone Configuration
const SUPERFONE_CONFIG = {
  baseURL: 'https://prod-api.superfone.co.in',
  apiKey: process.env.SUPERFONE_API_KEY!,
  cookie: process.env.SUPERFONE_COOKIE!,
  webhookSecret: process.env.SUPERFONE_WEBHOOK_SECRET!,
  version: 'v1', // Standard API version
  timeout: 30000
};

// Enterprise API Endpoints
const ENDPOINTS = {
  // Voice & Calling
  calls: '/superfone/api/calls',
  makeCall: '/superfone/api/calls/initiate',
  callStatus: '/superfone/api/calls',
  callRecording: '/superfone/api/calls/recording',
  callTransfer: '/superfone/api/calls/transfer',
  callHold: '/superfone/api/calls/hold',
  callMute: '/superfone/api/calls/mute',
  
  // WhatsApp Business API (Dragonfly)
  whatsapp: '/superfone/api/dragonfly/whatsapp',
  whatsappTemplates: '/superfone/api/dragonfly/whatsapp/templates',
  whatsappMedia: '/superfone/api/dragonfly/whatsapp/media',
  whatsappStatus: '/superfone/api/dragonfly/whatsapp/status',
  
  // SMS API
  sms: '/superfone/api/sms',
  smsTemplates: '/superfone/api/sms/templates',
  smsStatus: '/superfone/api/sms/status',
  
  // Contact Management
  contacts: '/superfone/api/contacts',
  contactGroups: '/superfone/api/contacts/groups',
  contactImport: '/superfone/api/contacts/import',
  contactExport: '/superfone/api/contacts/export',
  
  // Campaign Management
  campaigns: '/superfone/api/campaigns',
  campaignAnalytics: '/superfone/api/campaigns/analytics',
  campaignStats: '/superfone/api/campaigns/stats',
  
  // Analytics & Reporting
  analytics: '/superfone/api/analytics',
  reports: '/superfone/api/reports',
  callLogs: '/superfone/api/logs/calls',
  messageLogs: '/superfone/api/logs/messages',
  
  // Webhooks
  webhooks: '/superfone/api/webhooks',
  webhookLogs: '/superfone/api/webhooks/logs',
  
  // Integration & Automation
  integrations: '/superfone/api/integrations',
  workflows: '/superfone/api/workflows',
  triggers: '/superfone/api/triggers'
};

// Type Definitions for Enterprise Features
export interface SuperfoneCall {
  call_id?: string;
  from_number: string;
  to_number: string;
  caller_id?: string;
  call_duration?: number;
  recording_enabled?: boolean;
  webhook_url?: string;
  custom_data?: Record<string, unknown>;
}

export interface SuperfoneCallResponse {
  success: boolean;
  call_id?: string;
  call_uuid?: string;
  status?: string;
  error?: string;
  data?: Record<string, unknown>;
}

export interface SuperfoneWhatsAppMediaPayload {
  recipient: string;
  type: 'image' | 'video' | 'document' | 'audio';
  media_url: string;
  caption?: string;
}

export interface SuperfoneWhatsAppTemplate {
  template_name: string;
  language_code: string;
  recipient: string;
  components?: Array<{
    type: 'header' | 'body' | 'footer' | 'button';
    parameters?: Array<{
      type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
      text?: string;
      currency?: {
        fallback_value: string;
        code: string;
        amount_1000: number;
      };
      date_time?: {
        fallback_value: string;
      };
      image?: {
        link: string;
      };
      document?: {
        link: string;
        filename?: string;
      };
      video?: {
        link: string;
      };
    }>;
  }>;
  custom_data?: Record<string, unknown>;
}

export interface SuperfoneWhatsAppTemplateResponse {
  success: boolean;
  templates?: Array<{
    name: string;
    language: string;
    status: string;
    category: string;
    components?: unknown[];
  }>;
  error?: string;
}

export interface SuperfoneSMS {
  to_number: string;
  message: string;
  template_id?: string;
  sender_id?: string;
  schedule_time?: string;
  priority?: 'low' | 'normal' | 'high';
  custom_data?: Record<string, unknown>;
}

export interface SuperfoneSMSResponse {
  success: boolean;
  message_id?: string;
  id?: string; // Fallback property name
  status?: string;
  error?: string;
  data?: Record<string, unknown>;
}

export interface SuperfoneContact {
  phone_number: string;
  name?: string;
  email?: string;
  company?: string;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  groups?: string[];
}

export interface SuperfoneContactResponse {
  success: boolean;
  contact_id?: string;
  id?: string; // Fallback property name
  error?: string;
  data?: Record<string, unknown>;
}

export interface SuperfoneCampaign {
  name: string;
  type: 'call' | 'sms' | 'whatsapp';
  contacts: string[] | SuperfoneContact[];
  template_id?: string;
  schedule_time?: string;
  timezone?: string;
  retry_settings?: {
    max_attempts: number;
    retry_interval: number;
  };
  webhook_url?: string;
}

export interface SuperfoneWebhook {
  url: string;
  events: string[];
  secret?: string;
  active?: boolean;
  retry_policy?: {
    max_retries: number;
    retry_delay: number;
  };
}

export interface SuperfoneAnalytics {
  start_date: string;
  end_date: string;
  metrics: string[];
  filters?: Record<string, unknown>;
  group_by?: string[];
}

export interface SuperfoneLogFilters {
  call_status?: string;
  caller_id?: string;
  duration_min?: number;
  duration_max?: number;
  [key: string]: unknown;
}

export interface SuperfoneLogResponse {
  success: boolean;
  logs?: Array<Record<string, unknown>>;
  total_count?: number;
  page?: number;
  error?: string;
}

export class SuperfoneEnterpriseAPI {
  private config = SUPERFONE_CONFIG;

  /**
   * Make HTTP request to Superfone API
   */
  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: unknown,
    customHeaders?: Record<string, string>
  ): Promise<SuperfoneCallResponse> {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.config.baseURL);
      
      const options = {
        method,
        hostname: url.hostname,
        path: url.pathname + url.search,
        headers: {
          'x-api-key': this.config.apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cookie': `connect.sid=${this.config.cookie}`,
          ...(data ? { 'Content-Length': Buffer.byteLength(JSON.stringify(data)).toString() } : {}),
          ...customHeaders
        },
        timeout: this.config.timeout
      };

      const postData = data ? JSON.stringify(data) : null;

      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          try {
            const body = Buffer.concat(chunks);
            const response = body.length > 0 ? JSON.parse(body.toString()) : {};
            
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(response);
            } else {
              reject(new Error(response.message || `HTTP ${res.statusCode}`));
            }
          } catch (_parseError) {
            reject(new Error('Invalid API response format'));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (postData) {
        req.write(postData);
      }
      req.end();
    });
  }

  // =============================================================================
  // VOICE & CALLING API
  // =============================================================================

  /**
   * Initiate an outbound call
   */
  async makeCall(callData: SuperfoneCall): Promise<SuperfoneCallResponse> {
    try {
      const logMeta: LogMeta = {
        function: 'makeCall',
        from: callData.from_number,
        to: callData.to_number
      };

      logger.info('Initiating outbound call', logMeta);

      const response = await this.makeRequest(ENDPOINTS.makeCall, 'POST', {
        from: callData.from_number,
        to: callData.to_number,
        caller_id: callData.caller_id,
        recording_enabled: callData.recording_enabled ?? true,
        webhook_url: callData.webhook_url,
        custom_data: callData.custom_data
      });

      logger.info('Call initiated successfully', { ...logMeta, response });

      return {
        success: true,
        call_id: response.call_id,
        call_uuid: response.call_uuid,
        status: response.status,
        data: response.data || {}
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Failed to initiate call', { error: errorMessage });
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get call status
   */
  async getCallStatus(callId: string): Promise<SuperfoneCallResponse> {
    try {
      return await this.makeRequest(`${ENDPOINTS.callStatus}/${callId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get call status', { callId, error: errorMessage });
      throw error;
    }
  }

  /**
   * Transfer call
   */
  async transferCall(callId: string, transferTo: string): Promise<any> {
    try {
      return await this.makeRequest(ENDPOINTS.callTransfer, 'POST', {
        call_id: callId,
        transfer_to: transferTo
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to transfer call', { callId, transferTo, error: errorMessage });
      throw error;
    }
  }

  /**
   * Hold/Unhold call
   */
  async holdCall(callId: string, hold: boolean = true): Promise<SuperfoneCallResponse> {
    try {
      return await this.makeRequest(ENDPOINTS.callHold, 'POST', {
        call_id: callId,
        action: hold ? 'hold' : 'unhold'
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to hold/unhold call', { callId, hold, error: errorMessage });
      throw error;
    }
  }

  // =============================================================================
  // WHATSAPP BUSINESS API
  // =============================================================================

  /**
   * Send WhatsApp template message
   */
  async sendWhatsAppTemplate(templateData: SuperfoneWhatsAppTemplate): Promise<any> {
    try {
      const logMeta: LogMeta = {
        function: 'sendWhatsAppTemplate',
        template: templateData.template_name,
        recipient: templateData.recipient
      };

      logger.info('Sending WhatsApp template', logMeta);

      const response = await this.makeRequest(`${ENDPOINTS.whatsapp}/messages`, 'POST', {
        templateName: templateData.template_name,
        language: templateData.language_code,
        recipient: templateData.recipient,
        components: templateData.components,
        type: 'template'
      });

      logger.info('WhatsApp template sent successfully', { ...logMeta, response });
      return response;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send WhatsApp template', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Send WhatsApp text message
   */
  async sendWhatsAppText(to: string, message: string): Promise<SuperfoneSMSResponse> {
    try {
      return await this.makeRequest(`${ENDPOINTS.whatsapp}/messages`, 'POST', {
        recipient: to,
        message,
        type: 'text'
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send WhatsApp text', { to, error: errorMessage });
      throw error;
    }
  }

  /**
   * Send WhatsApp media message
   */
  async sendWhatsAppMedia(to: string, mediaUrl: string, mediaType: 'image' | 'video' | 'document' | 'audio', caption?: string): Promise<SuperfoneSMSResponse> {
    try {
      const payload: SuperfoneWhatsAppMediaPayload = {
        recipient: to,
        type: mediaType,
        media_url: mediaUrl
      };

      if (caption && (mediaType === 'image' || mediaType === 'video')) {
        payload.caption = caption;
      }

      return await this.makeRequest(`${ENDPOINTS.whatsapp}/messages`, 'POST', payload);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send WhatsApp media', { to, mediaType, error: errorMessage });
      throw error;
    }
  }

  /**
   * Get WhatsApp templates
   */
  async getWhatsAppTemplates(): Promise<SuperfoneWhatsAppTemplateResponse> {
    try {
      return await this.makeRequest(ENDPOINTS.whatsappTemplates);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get WhatsApp templates', { error: errorMessage });
      throw error;
    }
  }

  // =============================================================================
  // SMS API
  // =============================================================================

  /**
   * Send SMS
   */
  async sendSMS(smsData: SuperfoneSMS): Promise<SuperfoneSMSResponse> {
    try {
      const logMeta: LogMeta = {
        function: 'sendSMS',
        to: smsData.to_number
      };

      logger.info('Sending SMS', logMeta);

      const response = await this.makeRequest(ENDPOINTS.sms, 'POST', {
        to: smsData.to_number,
        message: smsData.message,
        template_id: smsData.template_id,
        sender_id: smsData.sender_id,
        schedule_time: smsData.schedule_time,
        priority: smsData.priority || 'normal',
        custom_data: smsData.custom_data
      });

      logger.info('SMS sent successfully', { ...logMeta, response });
      return response;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send SMS', { error: errorMessage });
      throw error;
    }
  }

  // =============================================================================
  // CONTACT MANAGEMENT
  // =============================================================================

  /**
   * Create or update contact
   */
  async createContact(contactData: SuperfoneContact): Promise<SuperfoneContactResponse> {
    try {
      return await this.makeRequest(ENDPOINTS.contacts, 'POST', contactData);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to create contact', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Get contact by phone number
   */
  async getContact(phoneNumber: string): Promise<SuperfoneContactResponse> {
    try {
      return await this.makeRequest(`${ENDPOINTS.contacts}?phone=${phoneNumber}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get contact', { phoneNumber, error: errorMessage });
      throw error;
    }
  }

  /**
   * Import contacts in bulk
   */
  async importContacts(contacts: SuperfoneContact[]): Promise<SuperfoneContactResponse> {
    try {
      return await this.makeRequest(ENDPOINTS.contactImport, 'POST', {
        contacts
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to import contacts', { count: contacts.length, error: errorMessage });
      throw error;
    }
  }

  // =============================================================================
  // CAMPAIGN MANAGEMENT
  // =============================================================================

  /**
   * Create campaign
   */
  async createCampaign(campaignData: SuperfoneCampaign): Promise<SuperfoneCallResponse> {
    try {
      return await this.makeRequest(ENDPOINTS.campaigns, 'POST', campaignData);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to create campaign', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Get campaign analytics
   */
  async getCampaignAnalytics(campaignId: string): Promise<SuperfoneLogResponse> {
    try {
      return await this.makeRequest(`${ENDPOINTS.campaignAnalytics}/${campaignId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get campaign analytics', { campaignId, error: errorMessage });
      throw error;
    }
  }

  // =============================================================================
  // ANALYTICS & REPORTING
  // =============================================================================

  /**
   * Get analytics data
   */
  async getAnalytics(analyticsData: SuperfoneAnalytics): Promise<SuperfoneLogResponse> {
    try {
      return await this.makeRequest(ENDPOINTS.analytics, 'POST', analyticsData);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get analytics', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Get call logs
   */
  async getCallLogs(startDate: string, endDate: string, filters?: SuperfoneLogFilters): Promise<SuperfoneLogResponse> {
    try {
      const params = new URLSearchParams();
      params.append('start_date', startDate);
      params.append('end_date', endDate);
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, String(value));
          }
        });
      }
      
      return await this.makeRequest(`${ENDPOINTS.callLogs}?${params}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get call logs', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Get message logs
   */
  async getMessageLogs(startDate: string, endDate: string, filters?: SuperfoneLogFilters): Promise<SuperfoneLogResponse> {
    try {
      const params = new URLSearchParams();
      params.append('start_date', startDate);
      params.append('end_date', endDate);
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, String(value));
          }
        });
      }
      
      return await this.makeRequest(`${ENDPOINTS.messageLogs}?${params}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get message logs', { error: errorMessage });
      throw error;
    }
  }

  // =============================================================================
  // WEBHOOK MANAGEMENT
  // =============================================================================

  /**
   * Create webhook
   */
  async createWebhook(webhookData: SuperfoneWebhook): Promise<SuperfoneCallResponse> {
    try {
      return await this.makeRequest(ENDPOINTS.webhooks, 'POST', webhookData);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to create webhook', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Get webhook logs
   */
  async getWebhookLogs(webhookId: string): Promise<SuperfoneLogResponse> {
    try {
      return await this.makeRequest(`${ENDPOINTS.webhookLogs}/${webhookId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get webhook logs', { webhookId, error: errorMessage });
      throw error;
    }
  }
}

// Export singleton instance
export const superfoneAPI = new SuperfoneEnterpriseAPI();