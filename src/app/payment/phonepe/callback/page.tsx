'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react';

import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { logger } from '../../../../lib/logger';

function PhonePeCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'checking' | 'success' | 'failed'>('checking');
  const [orderId, setOrderId] = useState<string>('');

  const checkPaymentStatus = useCallback(async (transactionId: string) => {
    try {
      const response = await fetch(`/api/payment/phonepe/status?transactionId=${transactionId}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        if (data.status === 'COMPLETED') {
          setStatus('success');
          // Redirect to order confirmation after a delay
          setTimeout(() => {
            if (orderId) {
              router.push(`/orders/${orderId}`);
            } else {
              router.push('/');
            }
          }, 3000);
        } else {
          setStatus('failed');
        }
      } else {
        setStatus('failed');
      }
    } catch (error) {
      logger.error('Error checking payment status:', { error, orderId });
      setStatus('failed');
    }
  }, [orderId, router]);

  useEffect(() => {
    const orderIdParam = searchParams.get('orderId');
    const txnId = searchParams.get('txnId');
    
    if (orderIdParam) {
      setOrderId(orderIdParam);
    }

    if (txnId) {
      checkPaymentStatus(txnId);
    } else {
      setStatus('failed');
    }
  }, [searchParams, checkPaymentStatus]);

  const getStatusContent = () => {
    switch (status) {
      case 'checking':
        return {
          icon: <Clock className="h-16 w-16 text-blue-500 animate-pulse" />,
          title: "Verifying Payment",
          description: "Please wait while we verify your payment...",
          color: "text-blue-600"
        };
      case 'success':
        return {
          icon: <CheckCircle className="h-16 w-16 text-green-500" />,
          title: "Payment Successful!",
          description: "Your payment has been processed successfully. Redirecting to order confirmation...",
          color: "text-green-600"
        };
      case 'failed':
        return {
          icon: <XCircle className="h-16 w-16 text-red-500" />,
          title: "Payment Failed",
          description: "Your payment could not be processed. Please try again.",
          color: "text-red-600"
        };
    }
  };

  const statusContent = getStatusContent();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {statusContent.icon}
            </div>
            <CardTitle className={`text-xl ${statusContent.color}`}>
              {statusContent.title}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="text-center space-y-6">
            <p className="text-gray-600">
              {statusContent.description}
            </p>

            {status === 'checking' && (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 text-sm">
                    🎉 Payment completed successfully!<br />
                    You will receive a confirmation email shortly.
                  </p>
                </div>
                
                {orderId && (
                  <Button
                    onClick={() => router.push(`/orders/${orderId}`)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    View Order Details
                  </Button>
                )}
              </div>
            )}

            {status === 'failed' && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">
                    ❌ Payment failed or was cancelled.<br />
                    No amount has been debited from your account.
                  </p>
                </div>
                
                <div className="space-y-2">
                  {orderId && (
                    <Button
                      onClick={() => router.push(`/payment/phonepe/${orderId}`)}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      Retry Payment
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => router.push('/')}
                    variant="outline"
                    className="w-full"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Continue Shopping
                  </Button>
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500">
              <p>🔒 Secure payment powered by PhonePe</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Clock className="h-16 w-16 text-blue-500 animate-pulse" />
            </div>
            <CardTitle className="text-xl text-blue-600">
              Loading Payment Status
            </CardTitle>
          </CardHeader>
          
          <CardContent className="text-center space-y-6">
            <p className="text-gray-600">
              Please wait while we load your payment information...
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PhonePeCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PhonePeCallbackContent />
    </Suspense>
  );
}