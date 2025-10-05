import { NextRequest } from 'next/server';

import { createClient } from '../../../../../lib/supabase/server';
import { rateLimit } from '../../../../../lib/rate-limit';
import { apiError, apiSuccess } from '../../../../../lib/errors';
import { logger } from '../../../../../lib/logger';

// Rate limit: 5 Razorpay initiations per minute per user (or IP)
const LIMIT = 5;
const WINDOW_MS = 60 * 1000;

// Razorpay Alternative Payment Gateway
// Faster setup than PhonePe - usually approved within 1-2 days

export async function POST(request: NextRequest) {
  try {
  const correlationId = request.headers.get('x-correlation-id') || null;
  const { orderId, amount, customerPhone, customerEmail, customerName } = await request.json();

    // Identify user (if authenticated)
    let userId: string | null = null;
    try {
      const supabaseAuth = await createClient();
      const { data: { user } } = await supabaseAuth.auth.getUser();
      userId = user?.id || null;
    } catch(_) {}
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateKey = userId ? `user:${userId}` : `ip:${ip}`;
    if (!rateLimit(rateKey, 'payment_razorpay_initiate', { limit: LIMIT, windowMs: WINDOW_MS })) {
      logger.warn('razorpay_rate_limited', { rateKey });
      return apiError('RATE_LIMITED', { correlationId });
    }

    if (!orderId || !amount) {
      return apiError('VALIDATION_ERROR', { correlationId, overrideMessage: 'Missing required fields: orderId, amount' });
    }

    const supabase = await createClient();

    // Get Razorpay settings from unified settings store (key: payment_razorpay)
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'payment_razorpay')
      .single();

    if (settingsError || !settings) {
      return apiError('SERVICE_UNAVAILABLE', { correlationId, overrideMessage: 'Razorpay payment method not configured' });
    }

  const razorpayConfig = (typeof settings.value === 'string' ? JSON.parse(settings.value) : settings.value) as {
      enabled: boolean;
      config: {
        keyId: string;
        keySecret: string;
      };
    };

    if (!razorpayConfig.enabled) {
      return apiError('VALIDATION_ERROR', { correlationId, overrideMessage: 'Razorpay payment method is disabled' });
    }

    const { keyId, keySecret } = razorpayConfig.config;

    if (!keyId || !keySecret) {
      return apiError('SERVICE_UNAVAILABLE', { correlationId, overrideMessage: 'Razorpay configuration incomplete' });
    }

    // Create Razorpay order
    const razorpayOrderData = {
      amount: Math.round(amount * 100), // Amount in paise
      currency: 'INR',
      receipt: `receipt_${orderId}`,
      notes: {
        orderId,
        customerEmail,
        customerPhone
      }
    };

    // Make request to Razorpay
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(razorpayOrderData)
    });

    if (!razorpayResponse.ok) {
      const errorData = await razorpayResponse.text();
      logger.error('razorpay_api_error', { orderId, response: errorData });
      return apiError('INTERNAL_ERROR', { correlationId, overrideMessage: 'Payment initialization failed', details: { error: errorData } });
    }

    const razorpayOrder = await razorpayResponse.json();

    // Return Razorpay order details for frontend
    logger.info('razorpay_initiated', { orderId, razorpayOrderId: razorpayOrder.id });
    const result = apiSuccess({
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId,
      orderId,
      customerName,
      customerEmail,
      customerPhone,
      notes: razorpayOrder.notes
    }, correlationId);
    result.headers.set('Cache-Control', 'no-store');
    result.headers.set('X-Content-Type-Options', 'nosniff');
    result.headers.set('Referrer-Policy', 'same-origin');
    result.headers.set('Permissions-Policy', 'payment=()');
    return result;

  } catch (error) {
    logger.error('razorpay_uncaught', { error: error instanceof Error ? error.message : 'unknown' });
    const correlationId = request.headers.get('x-correlation-id') || null;
    return apiError('INTERNAL_ERROR', { correlationId });
  }
}