/**
 * Paytm Payment Callback API
 * POST /api/payment/paytm/callback
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { createPaytmService } from '../../../../../lib/paytm-service';
import { logger } from '../../../../../lib/logger';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.local';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Service configuration error. Please contact support.' },
        { status: 503 }
      );
    }
    const body = await request.formData();
    const callbackData: Record<string, any> = {};

    // Convert FormData to object
    body.forEach((value, key) => {
      callbackData[key] = value.toString();
    });

    const orderId = callbackData.ORDERID;
    const txnId = callbackData.TXNID;
    const status = callbackData.STATUS;
    const txnAmount = callbackData.TXNAMOUNT;
    const respCode = callbackData.RESPCODE;
    const respMsg = callbackData.RESPMSG;

    logger.info('paytm.callback.received', { 
      orderId, 
      txnId, 
      status, 
      respCode 
    });

    // Get Paytm settings to verify checksum
    const { data: settingsRows, error: settingsError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'payment_paytm')
      .limit(1);

    const settings = settingsRows?.[0];
    if (settingsError || !settings) {
      logger.error('paytm.callback.settings_failed', { error: settingsError });
      return NextResponse.json(
        { error: 'Configuration error' },
        { status: 500 }
      );
    }

    const paytmConfig = (typeof settings.value === 'string' ? JSON.parse(settings.value) : settings.value) as {
      config: {
        merchantId: string;
        merchantKey: string;
        websiteName: string;
        industryType: string;
        channelId: string;
        environment: 'staging' | 'production';
      };
    };

    // Initialize Paytm service
    const paytmService = createPaytmService(paytmConfig.config);

    // Verify callback checksum
    const verification = await paytmService.verifyCallback(callbackData);

    if (!verification.valid) {
      logger.warn('paytm.callback.checksum_failed', { orderId });
      return NextResponse.json(
        { error: 'Invalid checksum' },
        { status: 400 }
      );
    }

    // Update transaction in database
    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        status: status === 'TXN_SUCCESS' ? 'success' : status === 'TXN_FAILURE' ? 'failed' : 'pending',
        gateway_transaction_id: txnId,
        gateway_response: callbackData,
        response_code: respCode,
        updated_at: new Date().toISOString()
      })
      .eq('transaction_id', orderId);

    if (updateError) {
      logger.error('paytm.callback.transaction_update_failed', { error: updateError, orderId });
    }

    // Get original order ID from transaction
    const { data: transaction, error: txnError } = await supabase
      .from('payment_transactions')
      .select('order_id')
      .eq('transaction_id', orderId)
      .single();

    if (txnError || !transaction) {
      logger.error('paytm.callback.transaction_not_found', { orderId });
      return NextResponse.redirect(new URL('/payment/failed', request.url));
    }

    // Update order status if payment successful
    if (status === 'TXN_SUCCESS') {
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          payment_method: 'paytm',
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.order_id);

      if (orderError) {
        logger.error('paytm.callback.order_update_failed', { error: orderError, orderId: transaction.order_id });
      }

      logger.info('paytm.callback.payment_success', { orderId, txnId, amount: txnAmount });

      return NextResponse.redirect(
        new URL(`/payment/success?orderId=${transaction.order_id}&txnId=${txnId}`, request.url)
      );
    } else {
      logger.warn('paytm.callback.payment_failed', { orderId, txnId, respCode, respMsg });

      return NextResponse.redirect(
        new URL(`/payment/failed?orderId=${transaction.order_id}&reason=${encodeURIComponent(respMsg)}`, request.url)
      );
    }

  } catch (error) {
    logger.error('paytm.callback.error', { error });
    return NextResponse.json(
      { error: 'Callback processing failed' },
      { status: 500 }
    );
  }
}