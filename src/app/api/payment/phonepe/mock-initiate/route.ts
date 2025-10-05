import { NextRequest, NextResponse } from 'next/server';

import { logger } from '../../../../../lib/logger';

// Mock PhonePe API for development testing
// This bypasses sandbox limitations and allows full payment flow testing

export async function POST(request: NextRequest) {
  try {
  const { orderId, amount } = await request.json();

    if (!orderId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, amount' },
        { status: 400 }
      );
    }

    // Simulate PhonePe processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate mock successful response
    const mockTransactionId = `MOCK_TXN_${Date.now()}`;
    const mockMerchantTransactionId = `TXN_${orderId}_${Date.now()}`;
    
    // Simulate 90% success rate (10% random failures for testing)
    const isSuccess = Math.random() > 0.1;
    
    if (isSuccess) {
      // Mock successful payment response
      const mockResponse = {
        success: true,
        code: 'PAYMENT_SUCCESS',
        message: 'Payment completed successfully',
        data: {
          merchantId: process.env.PHONEPE_MERCHANT_ID,
          merchantTransactionId: mockMerchantTransactionId,
          transactionId: mockTransactionId,
          amount,
          state: 'COMPLETED',
          responseCode: 'SUCCESS',
          paymentInstrument: {
            type: 'UPI',
            utr: `MOCK_UTR_${Date.now()}`
          }
        },
        // Mock payment URL for testing
        paymentUrl: `http://localhost:9003/mock-phonepe/payment?txnId=${mockTransactionId}&amount=${amount}`,
        transactionId: mockTransactionId,
        merchantTransactionId: mockMerchantTransactionId
      };

      logger.info('phonepe.mock.success', {
        orderId,
        amount,
        transactionId: mockTransactionId,
      });

      return NextResponse.json(mockResponse);
      
    } else {
      // Mock payment failure for testing error handling
      const mockErrorResponse = {
        success: false,
        code: 'PAYMENT_DECLINED',
        message: 'Payment was declined by the bank',
        data: {
          merchantId: process.env.PHONEPE_MERCHANT_ID,
          merchantTransactionId: mockMerchantTransactionId,
          transactionId: mockTransactionId,
          amount,
          state: 'FAILED',
          responseCode: 'PAYMENT_DECLINED'
        }
      };

      logger.warn('phonepe.mock.failure', {
        orderId,
        amount,
        reason: 'Random failure for testing',
      });

      return NextResponse.json(
        { error: 'Payment failed', details: mockErrorResponse },
        { status: 400 }
      );
    }

  } catch (error) {
    logger.error('phonepe.mock.error', { error });
    return NextResponse.json(
      { error: 'Mock payment service error' },
      { status: 500 }
    );
  }
}