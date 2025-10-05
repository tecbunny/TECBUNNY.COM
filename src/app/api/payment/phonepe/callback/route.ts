import crypto from 'crypto';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { resolveSiteUrl } from '../../../../../lib/site-url';
import { logger } from '../../../../../lib/logger';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.local';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

function verifyChecksum(response: string, checksum: string, saltKey: string, saltIndex: string): boolean {
  const string = response + saltKey;
  const sha256 = crypto.createHash('sha256').update(string).digest('hex');
  const expectedChecksum = `${sha256  }###${  saltIndex}`;
  return checksum === expectedChecksum;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Service configuration error. Please contact support.' },
        { status: 503 }
      );
    }
    const body = await request.json();
    const { response } = body;

    if (!response) {
      return NextResponse.json(
        { error: 'Invalid callback data' },
        { status: 400 }
      );
    }

    // Decode the response
    const decodedResponse = Buffer.from(response, 'base64').toString('utf-8');
    const responseData = JSON.parse(decodedResponse);

  logger.info('phonepe.callback.received', { merchantTransactionId: responseData?.data?.merchantTransactionId, state: responseData?.data?.state });

    // Get payment settings to verify checksum (unified settings key: payment_phonepe)
    const { data: settingsRows, error: settingsError } = await supabase
      .from('settings')
      .select('value, updated_at, created_at')
      .eq('key', 'payment_phonepe')
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1);

    const settings = settingsRows?.[0];
    if (settingsError || !settings) {
      logger.error('phonepe.callback.settings_failed', { error: settingsError });
      return NextResponse.json(
        { error: 'Configuration error' },
        { status: 500 }
      );
    }

  const phonePeConfig = (typeof settings.value === 'string' ? JSON.parse(settings.value) : settings.value) as {
      config: {
        saltKey: string;
        saltIndex: string;
      };
    };

    // Verify checksum
    const xVerify = request.headers.get('X-VERIFY');
    if (xVerify && !verifyChecksum(response, xVerify, phonePeConfig.config.saltKey, phonePeConfig.config.saltIndex)) {
      logger.warn('phonepe.callback.checksum_failed', { merchantTransactionId: responseData?.data?.merchantTransactionId });
      return NextResponse.json(
        { error: 'Invalid checksum' },
        { status: 400 }
      );
    }

  const { merchantTransactionId, transactionId, state, responseCode } = responseData.data;

    // Update transaction in database
    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        status: state === 'COMPLETED' ? 'success' : state === 'FAILED' ? 'failed' : 'pending',
        gateway_transaction_id: transactionId,
        gateway_response: responseData,
        response_code: responseCode,
        updated_at: new Date().toISOString()
      })
      .eq('transaction_id', merchantTransactionId);

    if (updateError) {
      logger.error('phonepe.callback.transaction_update_failed', { error: updateError, merchantTransactionId });
    }

    // Get order ID from transaction
    const { data: transaction, error: txnError } = await supabase
      .from('payment_transactions')
      .select('order_id')
      .eq('transaction_id', merchantTransactionId)
      .single();

    if (txnError || !transaction) {
      logger.error('phonepe.callback.transaction_lookup_failed', { error: txnError, merchantTransactionId });
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Update order status based on payment status
    if (state === 'COMPLETED') {
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'confirmed',
          payment_status: 'paid',
          payment_method: 'phonepe',
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.order_id);

      if (orderError) {
        logger.error('phonepe.callback.order_update_failed', { error: orderError, orderId: transaction.order_id });
      }

      // Send order confirmation email
      try {
        const { data: order } = await supabase
          .from('orders')
          .select('*')
          .eq('id', transaction.order_id)
          .single();

        if (order) {
          const orderData = JSON.parse(order.items || '{}');
          await fetch(`${resolveSiteUrl(request.headers.get('host') || undefined)}/api/email/order-confirmation`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: orderData.customer_email,
              orderData: {
                ...order,
                customer_email: orderData.customer_email,
                customer_phone: orderData.customer_phone
              }
            }),
          });
        }
      } catch (emailError) {
        logger.warn('phonepe.callback.email_error', { error: emailError, orderId: transaction.order_id });
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('phonepe.callback.unhandled_error', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}