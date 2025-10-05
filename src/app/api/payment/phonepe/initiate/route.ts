import crypto from 'crypto';

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { rateLimit } from '../../../../../lib/rate-limit';
import { createClient as createServerClient } from '../../../../../lib/supabase/server';
import { apiError, apiSuccess } from '../../../../../lib/errors';
import { logger } from '../../../../../lib/logger';
import { resolveSiteUrl } from '../../../../../lib/site-url';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.local';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

// PhonePe Configuration
const PHONEPE_BASE_URL = process.env.PHONEPE_BASE_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox'; // Use sandbox for testing

interface PhonePePayRequest {
  merchantId: string;
  merchantTransactionId: string;
  merchantUserId: string;
  amount: number;
  redirectUrl: string;
  redirectMode: string;
  callbackUrl: string;
  mobileNumber?: string;
  paymentInstrument: {
    type: 'PAY_PAGE';
  };
}

// Rate limit: 5 payment initiations per minute per user (or IP if unauthenticated)
const LIMIT = 5;
const WINDOW_MS = 60 * 1000;

export async function POST(request: NextRequest) {
  try {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return apiError('SERVICE_UNAVAILABLE', {
      overrideMessage: 'Service configuration error. Please contact support.'
    });
  }
  const correlationId = request.headers.get('x-correlation-id') || null;
  const { orderId, amount, customerPhone } = await request.json();

    // Identify user (prefer authenticated user ID)
    let userId: string | null = null;
    try {
      const supabaseServer = await createServerClient();
      const { data: { user } } = await supabaseServer.auth.getUser();
      userId = user?.id || null;
    } catch (_) {}
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateKey = userId ? `user:${userId}` : `ip:${ip}`;
    if (!rateLimit(rateKey, 'payment_phonepe_initiate', { limit: LIMIT, windowMs: WINDOW_MS })) {
      logger.warn('phonepe_rate_limited', { rateKey });
      return apiError('RATE_LIMITED', { correlationId });
    }

    if (!orderId || !amount) {
      
      return apiError('VALIDATION_ERROR', { correlationId, overrideMessage: 'Missing required fields: orderId, amount' });
    }

    // Get payment settings from unified settings store (key: payment_phonepe)
    // Be resilient to accidental duplicates by taking the latest row
    const { data: settingsRows, error: settingsError } = await supabase
      .from('settings')
      .select('value, updated_at, created_at')
      .eq('key', 'payment_phonepe')
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1);

    const settings = settingsRows?.[0];
    if (settingsError || !settings) {
      return apiError('SERVICE_UNAVAILABLE', { correlationId, overrideMessage: 'PhonePe payment method not configured' });
    }

  const phonePeConfig = (typeof settings.value === 'string' ? JSON.parse(settings.value) : settings.value) as {
      enabled: boolean;
      config: {
        merchantId: string;
        saltKey: string;
        saltIndex: string;
      };
    };

    if (!phonePeConfig.enabled) {
      return apiError('VALIDATION_ERROR', { correlationId, overrideMessage: 'PhonePe payment method is disabled' });
    }

    const { merchantId, saltKey, saltIndex } = phonePeConfig.config;

    if (!merchantId || !saltKey) {
      return apiError('SERVICE_UNAVAILABLE', { correlationId, overrideMessage: 'PhonePe configuration incomplete' });
    }

    // Generate unique transaction ID
    const merchantTransactionId = `TXN_${orderId}_${Date.now()}`;
    const merchantUserId = `USER_${orderId}_${Date.now()}`;

    // Prepare payment request
    const paymentRequest: PhonePePayRequest = {
      merchantId,
      merchantTransactionId,
      merchantUserId,
      amount: Math.round(amount * 100), // Amount in paise
  redirectUrl: `${resolveSiteUrl(request.headers.get('host') || undefined)}/payment/phonepe/callback?orderId=${orderId}&txnId=${merchantTransactionId}`,
      redirectMode: 'POST',
  callbackUrl: `${resolveSiteUrl(request.headers.get('host') || undefined)}/api/payment/phonepe/callback`,
      mobileNumber: customerPhone,
      paymentInstrument: {
        type: 'PAY_PAGE'
      }
    };

    // Encode payload
    const payload = JSON.stringify(paymentRequest);
    const payloadBase64 = Buffer.from(payload).toString('base64');

    // Generate checksum using configured salt
    const endpoint = '/pg/v1/pay';
    const string = payloadBase64 + endpoint + saltKey;
    const sha256 = crypto.createHash('sha256').update(string).digest('hex');
    const checksum = `${sha256  }###${  saltIndex}`;

    // Make request to PhonePe
    const phonePeResponse = await fetch(`${PHONEPE_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum
      },
      body: JSON.stringify({
        request: payloadBase64
      })
    });

    const responseData = await phonePeResponse.json();

  if (responseData.success) {
      // Store transaction details in database
      const { error: txnError } = await supabase
        .from('payment_transactions')
        .insert({
          order_id: orderId,
          transaction_id: merchantTransactionId,
          payment_method: 'phonepe',
          amount,
          status: 'initiated',
          gateway_response: responseData,
          created_at: new Date().toISOString()
        });

      if (txnError) {
        logger.error('phonepe_txn_store_failed', { err: txnError.message, orderId });
      }
      logger.info('phonepe_initiated', { orderId, transactionId: merchantTransactionId });
      const result = apiSuccess({
        paymentUrl: responseData.data.instrumentResponse.redirectInfo.url,
        transactionId: merchantTransactionId
      }, correlationId);
      result.headers.set('Cache-Control', 'no-store');
      result.headers.set('X-Content-Type-Options', 'nosniff');
      result.headers.set('Referrer-Policy', 'same-origin');
      result.headers.set('Permissions-Policy', 'payment=()');
      return result;
    } else {
      logger.error('phonepe_api_error', { response: responseData, orderId });
      return apiError('INTERNAL_ERROR', { correlationId, overrideMessage: 'Payment initialization failed', details: responseData });
    }

  } catch (error) {
    logger.error('phonepe_uncaught', { error: error instanceof Error ? error.message : 'unknown' });
    const correlationId = request.headers.get('x-correlation-id') || null;
    return apiError('INTERNAL_ERROR', { correlationId, details: { error: error instanceof Error ? error.message : 'Unknown error' } });
  }
}