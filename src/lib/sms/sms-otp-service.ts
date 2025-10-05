import axios from 'axios';

import { logger } from '../logger';

export interface SMSOTPConfig {
  apiKey: string;
  senderId?: string;
  baseUrl?: string;
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: string;
}

/**
 * SMS OTP Service using 2Factor API
 * Handles SMS delivery for OTP verification
 */
export class SMSOTPService {
  private config: SMSOTPConfig | null = null;
  private baseUrl: string | null = null;
  private initialized = false;

  constructor(config?: Partial<SMSOTPConfig>) {
    // Don't initialize immediately to avoid build-time errors
    if (config) {
      this.initializeConfig(config);
    }
  }

  private initializeConfig(config?: Partial<SMSOTPConfig>) {
    if (this.initialized) return;

    this.config = {
      apiKey: config?.apiKey || process.env.TWOFACTOR_API_KEY || '',
      senderId: config?.senderId || process.env.TWOFACTOR_SENDER_ID || 'TECBNY',
      baseUrl: config?.baseUrl || 'https://2factor.in/API'
    };

    this.baseUrl = this.config.baseUrl!;
    this.initialized = true;

    if (!this.config.apiKey) {
      throw new Error('2Factor API key is required');
    }
  }

  private ensureInitialized() {
    if (!this.initialized) {
      this.initializeConfig();
    }
  }

  /**
   * Send SMS OTP using 2Factor API
   */
  async sendOTP(phone: string, code: string, purpose: string = 'verification'): Promise<SMSResponse> {
    try {
      // Ensure service is initialized
      this.ensureInitialized();
      
      // Clean phone number (remove non-digits and country code handling)
      const cleanPhone = this.cleanPhoneNumber(phone);
      
      // Create message
      const message = this.createOTPMessage(code, purpose);

      // Prepare API request
      const requestData = {
        api_key: this.config!.apiKey,
        phone: cleanPhone,
        message,
        sender_id: this.config!.senderId
      };

      if (process.env.NODE_ENV === 'development') {
        logger.info('Sending SMS OTP', { phone: cleanPhone, purpose, sender: this.config!.senderId, context: 'SMSOTPService.sendOTP' });
      }

      // Send via 2Factor API
      const response = await axios.post(`${this.baseUrl!}/V1/SendSMS`, requestData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      // Handle 2Factor response format
      if (response.data.Status === 'Success') {
        return {
          success: true,
          messageId: response.data.Details || 'SMS_SENT',
          provider: '2factor'
        };
      } else {
        return {
          success: false,
          error: response.data.Details || 'Unknown SMS sending error',
          provider: '2factor'
        };
      }

    } catch (error: any) {
      logger.error('SMS OTP sending failed', { error, context: 'SMSOTPService.sendOTP' });

      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: `SMS API Error: ${error.response?.data?.Details || error.message}`,
          provider: '2factor'
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown SMS error',
        provider: '2factor'
      };
    }
  }

  /**
   * Send bulk SMS (for notifications, promotions, etc.)
   */
  async sendBulkSMS(recipients: string[], message: string): Promise<{
    success: boolean;
    results: Array<{ phone: string; success: boolean; messageId?: string; error?: string }>;
  }> {
    const results = [];

    for (const phone of recipients) {
      try {
        const result = await this.sendSMS(phone, message);
        results.push({
          phone,
          success: result.success,
          messageId: result.messageId,
          error: result.error
        });
      } catch (error) {
        results.push({
          phone,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    return {
      success: successCount > 0,
      results
    };
  }

  /**
   * Send plain SMS (non-OTP)
   */
  async sendSMS(phone: string, message: string): Promise<SMSResponse> {
    try {
      this.ensureInitialized();
      const cleanPhone = this.cleanPhoneNumber(phone);

      const requestData = {
        api_key: this.config!.apiKey,
        phone: cleanPhone,
        message,
        sender_id: this.config!.senderId
      };

      const response = await axios.post(`${this.baseUrl!}/V1/SendSMS`, requestData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.data.Status === 'Success') {
        return {
          success: true,
          messageId: response.data.Details || 'SMS_SENT',
          provider: '2factor'
        };
      } else {
        return {
          success: false,
          error: response.data.Details || 'SMS sending failed',
          provider: '2factor'
        };
      }

    } catch (error) {
      logger.error('SMS sending failed', { error, context: 'SMSOTPService.sendSMS' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMS sending failed',
        provider: '2factor'
      };
    }
  }

  /**
   * Verify OTP using 2Factor verification API (if supported)
   */
  async verifyOTP(phone: string, otp: string, sessionId?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      this.ensureInitialized();
      // Note: This depends on 2Factor's OTP verification API
      // Check their documentation for the exact endpoint and format
      const cleanPhone = this.cleanPhoneNumber(phone);

      const requestData = {
        api_key: this.config!.apiKey,
        phone: cleanPhone,
        otp,
        session_id: sessionId
      };

      const response = await axios.post(`${this.baseUrl!}/V1/VerifyOTP`, requestData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return {
        success: response.data.Status === 'Success',
        error: response.data.Status !== 'Success' ? response.data.Details : undefined
      };

    } catch (error) {
      logger.error('OTP verification failed', { error, context: 'SMSOTPService.verifyOTP' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OTP verification failed'
      };
    }
  }

  /**
   * Get account balance from 2Factor
   */
  async getBalance(): Promise<{
    success: boolean;
    balance?: number;
    currency?: string;
    error?: string;
  }> {
    try {
      this.ensureInitialized();
      const response = await axios.get(`${this.baseUrl!}/V1/Balance/${this.config!.apiKey}`, {
        timeout: 10000
      });

      if (response.data.Status === 'Success') {
        return {
          success: true,
          balance: parseFloat(response.data.Details.Balance),
          currency: 'INR' // 2Factor typically uses INR
        };
      } else {
        return {
          success: false,
          error: response.data.Details || 'Failed to fetch balance'
        };
      }

    } catch (error) {
      logger.error('Balance check failed', { error, context: 'SMSOTPService.getBalance' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Balance check failed'
      };
    }
  }

  /**
   * Clean and format phone number for 2Factor API
   */
  private cleanPhoneNumber(phone: string): string {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    
    // Handle Indian numbers (2Factor is Indian service)
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      // Already has country code
      return cleaned;
    } else if (cleaned.length === 10) {
      // Add Indian country code
      return `91${  cleaned}`;
    } else if (cleaned.startsWith('0') && cleaned.length === 11) {
      // Remove leading 0 and add country code
      return `91${  cleaned.substring(1)}`;
    }
    
    // Return as-is for other formats
    return cleaned;
  }

  /**
   * Create OTP message with consistent formatting
   */
  private createOTPMessage(code: string, purpose: string): string {
    const purposeText = this.getPurposeText(purpose);
    return `Your ${purposeText} OTP is: ${code}. Valid for 5 minutes. Do not share this code. - Tecbunny Solutions`;
  }

  /**
   * Get user-friendly purpose text
   */
  private getPurposeText(purpose: string): string {
    const purposeMap: Record<string, string> = {
      'login': 'login',
      'registration': 'registration', 
      'password_reset': 'password reset',
      'transaction': 'transaction verification',
      'agent_order': 'order verification'
    };

    return purposeMap[purpose] || 'verification';
  }

  /**
   * Check if phone number format is valid
   */
  isValidPhoneNumber(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '');
    
    // Basic validation for Indian numbers (adjust for other countries as needed)
    if (cleaned.length >= 10 && cleaned.length <= 12) {
      return true;
    }
    
    return false;
  }

  /**
   * Get delivery status (if 2Factor supports delivery reports)
   */
  async getDeliveryStatus(messageId: string): Promise<{
    success: boolean;
    status?: 'sent' | 'delivered' | 'failed' | 'pending';
    error?: string;
  }> {
    try {
      this.ensureInitialized();
      // Note: Check 2Factor documentation for delivery status API
      const response = await axios.get(
        `${this.baseUrl!}/V1/Status/${this.config!.apiKey}/${messageId}`,
        { timeout: 10000 }
      );

      if (response.data.Status === 'Success') {
        return {
          success: true,
          status: this.mapDeliveryStatus(response.data.Details.Status)
        };
      } else {
        return {
          success: false,
          error: response.data.Details || 'Failed to get delivery status'
        };
      }

    } catch (error) {
      logger.error('Delivery status check failed', { error, context: 'SMSOTPService.getDeliveryStatus' });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Status check failed'
      };
    }
  }

  /**
   * Map 2Factor status to standard status
   */
  private mapDeliveryStatus(status: string): 'sent' | 'delivered' | 'failed' | 'pending' {
    const statusMap: Record<string, 'sent' | 'delivered' | 'failed' | 'pending'> = {
      'SENT': 'sent',
      'DELIVERED': 'delivered', 
      'FAILED': 'failed',
      'PENDING': 'pending'
    };

    return statusMap[status.toUpperCase()] || 'pending';
  }
}

// Export singleton instance
export const smsOTPService = new SMSOTPService();