/**
 * Paytm Payment Gateway Integration
 * Official Paytm All-in-One SDK for Node.js
 */

import crypto from 'crypto';

import { logger } from './logger';

export interface PaytmConfig {
  merchantId: string;
  merchantKey: string;
  websiteName: string;
  industryType: string;
  channelId: string;
  environment: 'staging' | 'production';
}

export interface PaytmPaymentRequest {
  orderId: string;
  amount: string;
  customerId: string;
  customerEmail?: string;
  customerPhone: string;
  callbackUrl: string;
}

export interface PaytmPaymentResponse {
  success: boolean;
  txnToken?: string;
  orderId?: string;
  mid?: string;
  error?: string;
  body?: any;
}

export class PaytmPaymentService {
  private config: PaytmConfig;
  private baseUrl: string;

  constructor(config: PaytmConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'production'
      ? 'https://securegw.paytm.in'
      : 'https://securegw-stage.paytm.in';
  }

  /**
   * Generate checksum for Paytm request
   */
  private generateChecksum(params: Record<string, any>): string {
    const data = JSON.stringify(params);
    const salt = this.config.merchantKey;
    
    const checksum = crypto
      .createHash('sha256')
      .update(data + salt)
      .digest('hex');
    
    return checksum;
  }

  /**
   * Verify checksum from Paytm response
   */
  private verifyChecksum(params: Record<string, any>, checksum: string): boolean {
    const data = JSON.stringify(params);
    const salt = this.config.merchantKey;
    
    const expectedChecksum = crypto
      .createHash('sha256')
      .update(data + salt)
      .digest('hex');
    
    return checksum === expectedChecksum;
  }

  /**
   * Generate Paytm checksum using native SDK method
   */
  private async generatePaytmChecksum(params: Record<string, any>, key: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const paramsString = JSON.stringify(params);
        
        // Paytm checksum generation algorithm
        const salt = crypto.randomBytes(4).toString('hex');
        const checksum = crypto
          .createHash('sha256')
          .update(`${paramsString}|${salt}`)
          .digest('hex');
        
        const finalChecksum = checksum + salt;
        
        // Encrypt with merchant key
        const cipher = crypto.createCipheriv('aes-128-cbc', key.substr(0, 16), Buffer.alloc(16, 0));
        let encrypted = cipher.update(finalChecksum, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        
        resolve(encrypted);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Verify Paytm checksum
   */
  private async verifyPaytmChecksum(params: Record<string, any>, checksum: string, key: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        // Decrypt checksum
        const decipher = crypto.createDecipheriv('aes-128-cbc', key.substr(0, 16), Buffer.alloc(16, 0));
        let decrypted = decipher.update(checksum, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        
        const salt = decrypted.substr(decrypted.length - 8);
        const checksumHash = decrypted.substr(0, decrypted.length - 8);
        
        const paramsString = JSON.stringify(params);
        const expectedChecksum = crypto
          .createHash('sha256')
          .update(`${paramsString}|${salt}`)
          .digest('hex');
        
        resolve(checksumHash === expectedChecksum);
      } catch (error) {
        logger.error('Checksum verification failed', { error });
        resolve(false);
      }
    });
  }

  /**
   * Initiate Paytm payment transaction
   * Step 1: Get transaction token
   */
  async initiateTransaction(paymentRequest: PaytmPaymentRequest): Promise<PaytmPaymentResponse> {
    try {
      const { orderId, amount, customerId, customerEmail, customerPhone, callbackUrl } = paymentRequest;

      // Prepare request body for transaction token
      const paytmParams = {
        body: {
          requestType: 'Payment',
          mid: this.config.merchantId,
          websiteName: this.config.websiteName,
          orderId,
          callbackUrl,
          txnAmount: {
            value: amount,
            currency: 'INR'
          },
          userInfo: {
            custId: customerId,
            email: customerEmail || '',
            mobile: customerPhone
          }
        }
      };

      // Generate checksum
      const checksum = await this.generatePaytmChecksum(paytmParams.body, this.config.merchantKey);

      // Request transaction token from Paytm
      const response = await fetch(`${this.baseUrl}/theia/api/v1/initiateTransaction?mid=${this.config.merchantId}&orderId=${orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MID': this.config.merchantId,
          'X-CHECKSUM': checksum
        },
        body: JSON.stringify(paytmParams.body)
      });

      const data = await response.json();

      if (data.body && data.body.resultInfo && data.body.resultInfo.resultStatus === 'S') {
        logger.info('Paytm transaction initiated', { orderId, txnToken: data.body.txnToken });

        return {
          success: true,
          txnToken: data.body.txnToken,
          orderId,
          mid: this.config.merchantId,
          body: data.body
        };
      } else {
        const errorMsg = data.body?.resultInfo?.resultMsg || 'Transaction initiation failed';
        logger.error('Paytm transaction initiation failed', { orderId, error: errorMsg });

        return {
          success: false,
          error: errorMsg,
          body: data
        };
      }

    } catch (error) {
      logger.error('Error initiating Paytm transaction', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get transaction status from Paytm
   */
  async getTransactionStatus(orderId: string): Promise<any> {
    try {
      const paytmParams = {
        body: {
          mid: this.config.merchantId,
          orderId
        }
      };

      const checksum = await this.generatePaytmChecksum(paytmParams.body, this.config.merchantKey);

      const response = await fetch(`${this.baseUrl}/v3/order/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MID': this.config.merchantId,
          'X-CHECKSUM': checksum
        },
        body: JSON.stringify(paytmParams.body)
      });

      const data = await response.json();

      logger.info('Paytm transaction status fetched', { orderId, status: data.body?.resultInfo?.resultStatus });

      return data;

    } catch (error) {
      logger.error('Error fetching Paytm transaction status', { error, orderId });
      throw error;
    }
  }

  /**
   * Verify payment callback from Paytm
   */
  async verifyCallback(callbackData: Record<string, any>): Promise<{ valid: boolean; data: any }> {
    try {
      const checksumReceived = callbackData.CHECKSUMHASH;
      delete callbackData.CHECKSUMHASH;

      const isValid = await this.verifyPaytmChecksum(callbackData, checksumReceived, this.config.merchantKey);

      if (isValid) {
        logger.info('Paytm callback verified', { orderId: callbackData.ORDERID });
        return { valid: true, data: callbackData };
      } else {
        logger.warn('Paytm callback verification failed', { orderId: callbackData.ORDERID });
        return { valid: false, data: callbackData };
      }

    } catch (error) {
      logger.error('Error verifying Paytm callback', { error });
      return { valid: false, data: callbackData };
    }
  }

  /**
   * Get Paytm payment form URL
   */
  getPaymentUrl(): string {
    return `${this.baseUrl}/theia/api/v1/showPaymentPage`;
  }

  /**
   * Refund transaction
   */
  async refundTransaction(params: {
    orderId: string;
    refId: string;
    txnId: string;
    txnType: 'REFUND';
    refundAmount: string;
  }): Promise<any> {
    try {
      const paytmParams = {
        body: {
          mid: this.config.merchantId,
          orderId: params.orderId,
          refId: params.refId,
          txnId: params.txnId,
          txnType: params.txnType,
          refundAmount: params.refundAmount
        }
      };

      const checksum = await this.generatePaytmChecksum(paytmParams.body, this.config.merchantKey);

      const response = await fetch(`${this.baseUrl}/refund/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MID': this.config.merchantId,
          'X-CHECKSUM': checksum
        },
        body: JSON.stringify(paytmParams.body)
      });

      const data = await response.json();

      logger.info('Paytm refund initiated', { orderId: params.orderId, refId: params.refId });

      return data;

    } catch (error) {
      logger.error('Error initiating Paytm refund', { error, orderId: params.orderId });
      throw error;
    }
  }
}

// Helper function to create Paytm service instance
export function createPaytmService(config: PaytmConfig): PaytmPaymentService {
  return new PaytmPaymentService(config);
}
