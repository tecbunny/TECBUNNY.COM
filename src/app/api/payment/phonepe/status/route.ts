import crypto from 'crypto';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.local';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

const PHONEPE_BASE_URL = process.env.PHONEPE_BASE_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox';

export async function GET(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Service configuration error. Please contact support.' },
        { status: 503 }
      );
    }
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Get payment settings from unified settings store (key: payment_phonepe)
    const { data: settingsRows, error: settingsError } = await supabase
      .from('settings')
      .select('value, updated_at, created_at')
      .eq('key', 'payment_phonepe')
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1);

    const settings = settingsRows?.[0];
    if (settingsError || !settings) {
      return NextResponse.json(
        { error: 'PhonePe configuration not found' },
        { status: 500 }
      );
    }

  const phonePeConfig = (typeof settings.value === 'string' ? JSON.parse(settings.value) : settings.value) as {
      config: {
        merchantId: string;
        saltKey: string;
        saltIndex: string;
      };
    };

    const { merchantId, saltKey, saltIndex } = phonePeConfig.config;

    // Generate checksum for status check
    const endpoint = `/pg/v1/status/${merchantId}/${transactionId}`;
    const string = endpoint + saltKey;
    const sha256 = crypto.createHash('sha256').update(string).digest('hex');
    const checksum = `${sha256  }###${  saltIndex}`;

    // Make status check request
    const response = await fetch(`${PHONEPE_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'X-MERCHANT-ID': merchantId
      }
    });

    const responseData = await response.json();

    if (responseData.success) {
  const { state, amount, transactionId: gatewayTxnId, responseCode } = responseData.data;
  const normalizedAmount = typeof amount === 'number' ? amount / 100 : Number(amount ?? 0) / 100;

      // Update local transaction record
      const { error: updateError } = await supabase
        .from('payment_transactions')
        .update({
          status: state === 'COMPLETED' ? 'success' : state === 'FAILED' ? 'failed' : 'pending',
          gateway_transaction_id: gatewayTxnId,
          gateway_response: responseData,
          response_code: responseCode,
          updated_at: new Date().toISOString()
        })
        .eq('transaction_id', transactionId);

      if (updateError) {
        console.error('Failed to update transaction:', updateError);
      }

      // If payment successful, update order
      if (state === 'COMPLETED') {
        const { data: transaction } = await supabase
          .from('payment_transactions')
          .select('order_id')
          .eq('transaction_id', transactionId)
          .single();

        if (transaction) {
          await supabase
            .from('orders')
            .update({
              status: 'Payment Confirmed',
              updated_at: new Date().toISOString()
            })
            .eq('id', transaction.order_id);
        }
      }

      return NextResponse.json({
        success: true,
        status: state,
        amount: normalizedAmount,
        transactionId: gatewayTxnId,
        responseCode
      });
    } else {
      return NextResponse.json(
        { error: 'Status check failed', details: responseData },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('PhonePe status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
