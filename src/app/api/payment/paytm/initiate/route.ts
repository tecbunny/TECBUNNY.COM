/**
 * Paytm Payment Initiation API
 * POST /api/payment/paytm/initiate
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { createPaytmService } from '../../../../../lib/paytm-service';
import { rateLimit } from '../../../../../lib/rate-limit';
import { apiError, apiSuccess } from '../../../../../lib/errors';
import { logger } from '../../../../../lib/logger';
import { resolveSiteUrl } from '../../../../../lib/site-url';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.local';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

// Rate limit: 5 payment initiations per minute per user
const LIMIT = 5;
const WINDOW_MS = 60 * 1000;

export async function POST(request: NextRequest) {
  const correlationId = request.headers.get('x-correlation-id') || crypto.randomUUID();

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return apiError('SERVICE_UNAVAILABLE', {
        correlationId,
        overrideMessage: 'Service configuration error. Please contact support.'
      });
    }
    // Rate limiting
    const identifier = request.headers.get('x-forwarded-for') || 'anonymous';
    const rateLimitResult = await rateLimit(identifier, LIMIT, WINDOW_MS);

    if (!rateLimitResult.allowed) {
      logger.warn('paytm.rate_limited', { identifier, correlationId });
      return apiError('RATE_LIMITED', { correlationId });
    }

    const body = await request.json().catch(() => ({}));
    const { orderId, amount, customerPhone } = body;

    if (!orderId || !amount || !customerPhone) {
      return apiError('VALIDATION_ERROR', { 
        correlationId, 
        overrideMessage: 'Missing required fields: orderId, amount, customerPhone' 
      });
    }

    // Get Paytm settings from database
    const { data: settingsRows, error: settingsError } = await supabase
      .from('settings')
      .select('value, updated_at, created_at')
      .eq('key', 'payment_paytm')
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1);

    const settings = settingsRows?.[0];
    if (settingsError || !settings) {
      return apiError('SERVICE_UNAVAILABLE', { 
        correlationId, 
        overrideMessage: 'Paytm payment method not configured' 
      });
    }

    const paytmConfig = (typeof settings.value === 'string' ? JSON.parse(settings.value) : settings.value) as {
      enabled: boolean;
      config: {
        merchantId: string;
        merchantKey: string;
        websiteName: string;
        industryType: string;
        channelId: string;
        environment: 'staging' | 'production';
      };
    };

    if (!paytmConfig.enabled) {
      return apiError('VALIDATION_ERROR', { 
        correlationId, 
        overrideMessage: 'Paytm payment method is disabled' 
      });
    }

    const { merchantId, merchantKey, websiteName, industryType, channelId, environment } = paytmConfig.config;

    if (!merchantId || !merchantKey || !websiteName) {
      return apiError('SERVICE_UNAVAILABLE', { 
        correlationId, 
        overrideMessage: 'Paytm configuration incomplete' 
      });
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, customer:profiles!orders_customer_id_fkey(email)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return apiError('NOT_FOUND', { correlationId, overrideMessage: 'Order not found' });
    }

    // Generate unique transaction ID
    const txnId = `PAYTM_${orderId}_${Date.now()}`;

    // Initialize Paytm service
    const paytmService = createPaytmService({
      merchantId,
      merchantKey,
      websiteName,
      industryType,
      channelId,
      environment
    });

    // Prepare callback URL
    const siteUrl = resolveSiteUrl(request.headers.get('host') || undefined);
    const callbackUrl = `${siteUrl}/api/payment/paytm/callback`;

    // Initiate transaction
    const result = await paytmService.initiateTransaction({
      orderId: txnId,
      amount: amount.toString(),
      customerId: order.customer_id || `GUEST_${Date.now()}`,
      customerEmail: order.customer?.email,
      customerPhone,
      callbackUrl
    });

    if (!result.success) {
      logger.error('paytm_initiation_failed', { orderId, error: result.error, correlationId });
      return apiError('INTERNAL_ERROR', { 
        correlationId, 
        overrideMessage: 'Payment initialization failed', 
        details: result.body 
      });
    }

    // Store transaction in database
    const { error: txnError } = await supabase
      .from('payment_transactions')
      .insert({
        order_id: orderId,
        transaction_id: txnId,
        payment_method: 'paytm',
        amount: parseFloat(amount),
        status: 'initiated',
        gateway_response: result.body,
        created_at: new Date().toISOString()
      });

    if (txnError) {
      logger.error('paytm_txn_store_failed', { error: txnError.message, orderId, correlationId });
    }

    logger.info('paytm_initiated', { orderId, txnId, correlationId });

    const response = apiSuccess({
      txnToken: result.txnToken,
      orderId: txnId,
      mid: result.mid,
      amount,
      paymentUrl: paytmService.getPaymentUrl(),
      environment
    }, correlationId);

    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    
    return response;

  } catch (error) {
    logger.error('paytm_uncaught', { error: error instanceof Error ? error.message : 'unknown', correlationId });
    return apiError('INTERNAL_ERROR', { correlationId, details: { error: error instanceof Error ? error.message : 'Unknown error' } });
  }
}