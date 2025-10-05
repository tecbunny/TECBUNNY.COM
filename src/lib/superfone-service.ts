/**
 * Superfone Service - Integrated with existing working implementation
 * Combines enterprise features with proven working API calls
 */

import https from 'https';

import { logger, LogMeta } from './logger';

// Use existing working configuration
const SUPERFONE_CONFIG = {
  hostname: 'prod-api.superfone.co.in',
  apiKey: process.env.SUPERFONE_API_KEY!,
  cookie: process.env.SUPERFONE_COOKIE!,
  webhookSecret: process.env.SUPERFONE_WEBHOOK_SECRET!,
  timeout: 30000
};

// Proven working endpoints
const ENDPOINTS = {
  whatsapp: '/superfone/api/dragonfly/whatsapp',
  calls: '/superfone/api/calls',
  sms: '/superfone/api/sms',
  contacts: '/superfone/api/contacts',
  analytics: '/superfone/api/analytics'
};

export interface SuperfoneCallRequest {
  from_number: string;
  to_number: string;
  caller_id?: string;
  recording_enabled?: boolean;
}

export interface SuperfoneWhatsAppRequest {
  templateName?: string;
  language?: string;
  recipient: string;
  message?: string;
  type: 'template' | 'text';
  components?: any[];
}

export interface SuperfoneSMSRequest {
  to_number: string;
  message: string;
  sender_id?: string;
}

export interface SuperfoneResponse {
  success: boolean;
  data?: any;
  error?: string;
  message_id?: string;
  call_id?: string;
}

export class SuperfoneService {
  private config = SUPERFONE_CONFIG;

  /**
   * Make HTTP request using proven working format
   */
  private async makeRequest(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
    data?: any
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const options = {
        method,
        hostname: this.config.hostname,
        path,
        headers: {
          'x-api-key': this.config.apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Cookie': `connect.sid=${this.config.cookie}`
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

  /**
   * Send WhatsApp message (template or text)
   */
  async sendWhatsApp(request: SuperfoneWhatsAppRequest): Promise<SuperfoneResponse> {
    try {
      const logMeta: LogMeta = {
        function: 'sendWhatsApp',
        type: request.type,
        recipient: request.recipient
      };

      logger.info('Sending WhatsApp message', logMeta);

      let payload: any;
      
      if (request.type === 'template') {
        payload = {
          templateName: request.templateName,
          language: request.language || 'en',
          recipient: request.recipient,
          components: request.components,
          type: 'template'
        };
      } else {
        payload = {
          recipient: request.recipient,
          message: request.message,
          type: 'text'
        };
      }

      const response = await this.makeRequest(`${ENDPOINTS.whatsapp}/messages`, 'POST', payload);

      logger.info('WhatsApp message sent successfully', { ...logMeta, response });

      return {
        success: true,
        data: response,
        message_id: response.messageId || response.id
      };
    } catch (error: any) {
      logger.error('Failed to send WhatsApp message', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Initiate phone call
   */
  async makeCall(request: SuperfoneCallRequest): Promise<SuperfoneResponse> {
    try {
      const logMeta: LogMeta = {
        function: 'makeCall',
        from: request.from_number,
        to: request.to_number
      };

      logger.info('Initiating call', logMeta);

      const payload = {
        from: request.from_number,
        to: request.to_number,
        caller_id: request.caller_id,
        recording_enabled: request.recording_enabled ?? true
      };

      const response = await this.makeRequest(`${ENDPOINTS.calls}/initiate`, 'POST', payload);

      logger.info('Call initiated successfully', { ...logMeta, response });

      return {
        success: true,
        data: response,
        call_id: response.call_id || response.id
      };
    } catch (error: any) {
      logger.error('Failed to initiate call', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send SMS
   */
  async sendSMS(request: SuperfoneSMSRequest): Promise<SuperfoneResponse> {
    try {
      const logMeta: LogMeta = {
        function: 'sendSMS',
        to: request.to_number
      };

      logger.info('Sending SMS', logMeta);

      const payload = {
        to: request.to_number,
        message: request.message,
        sender_id: request.sender_id
      };

      const response = await this.makeRequest(ENDPOINTS.sms, 'POST', payload);

      logger.info('SMS sent successfully', { ...logMeta, response });

      return {
        success: true,
        data: response,
        message_id: response.message_id || response.id
      };
    } catch (error: any) {
      logger.error('Failed to send SMS', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create or update contact
   */
  async createContact(contactData: any): Promise<SuperfoneResponse> {
    try {
      const logMeta: LogMeta = {
        function: 'createContact',
        phone: contactData.phone_number
      };

      logger.info('Creating contact', logMeta);

      const response = await this.makeRequest(ENDPOINTS.contacts, 'POST', contactData);

      logger.info('Contact created successfully', { ...logMeta, response });

      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      logger.error('Failed to create contact', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get analytics data
   */
  async getAnalytics(params: any): Promise<SuperfoneResponse> {
    try {
      logger.info('Fetching analytics', params);

      const response = await this.makeRequest(ENDPOINTS.analytics, 'POST', params);

      logger.info('Analytics fetched successfully', { response });

      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      logger.error('Failed to fetch analytics', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get call status
   */
  async getCallStatus(callId: string): Promise<SuperfoneResponse> {
    try {
      const response = await this.makeRequest(`${ENDPOINTS.calls}/${callId}`, 'GET');
      
      return {
        success: true,
        data: response
      };
    } catch (error: any) {
      logger.error('Failed to get call status', { callId, error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(payload)
        .digest('hex');
      
      return `sha256=${expectedSignature}` === signature;
    } catch (error) {
      logger.error('Failed to verify webhook signature', { error });
      return false;
    }
  }
}

// Export singleton instance
export const superfoneService = new SuperfoneService();

// Also export for backward compatibility
export { superfoneService as superfoneAPI };