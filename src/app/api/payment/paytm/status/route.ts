/**
 * Paytm Payment Status Check API
 * GET /api/payment/paytm/status?transactionId=XXX
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { createPaytmService } from '../../../../../lib/paytm-service';
import { logger } from '../../../../../lib/logger';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.local';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

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

    // Get Paytm settings
    const { data: settingsRows, error: settingsError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'payment_paytm')
      .limit(1);

    const settings = settingsRows?.[0];
    if (settingsError || !settings) {
      return NextResponse.json(
        { error: 'Paytm configuration not found' },
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

    // Get transaction status from Paytm
    const statusResponse = await paytmService.getTransactionStatus(transactionId);

    if (statusResponse.body && statusResponse.body.resultInfo) {
      const { resultCode, resultMsg } = statusResponse.body.resultInfo;
      const txnStatus = statusResponse.body.txnStatus;
      const txnAmount = statusResponse.body.txnAmount;

      // Update local transaction record
      const { error: updateError } = await supabase
        .from('payment_transactions')
        .update({
          status: txnStatus === 'TXN_SUCCESS' ? 'success' : txnStatus === 'TXN_FAILURE' ? 'failed' : 'pending',
          gateway_response: statusResponse.body,
          response_code: resultCode,
          updated_at: new Date().toISOString()
        })
        .eq('transaction_id', transactionId);

      if (updateError) {
        logger.error('Failed to update transaction:', { error: updateError.message });
      }

      // If payment successful, update order
      if (txnStatus === 'TXN_SUCCESS') {
        const { data: transaction } = await supabase
          .from('payment_transactions')
          .select('order_id')
          .eq('transaction_id', transactionId)
          .single();

        if (transaction) {
          await supabase
            .from('orders')
            .update({
              payment_status: 'paid',
              payment_method: 'paytm',
              status: 'confirmed'
            })
            .eq('id', transaction.order_id);
        }
      }

      return NextResponse.json({
        success: txnStatus === 'TXN_SUCCESS',
        status: txnStatus,
        code: resultCode,
        message: resultMsg,
        amount: txnAmount,
        orderId: transactionId
      });

    } else {
      return NextResponse.json(
        { error: 'Failed to fetch transaction status' },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('Error checking Paytm status:', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Status check failed' },
      { status: 500 }
    );
  }
}