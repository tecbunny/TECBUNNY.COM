'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import { ArrowLeft, Smartphone, Clock, CheckCircle, XCircle } from 'lucide-react';

import { createClient } from '../../../../lib/supabase/client';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Separator } from '../../../../components/ui/separator';
import { useToast } from '../../../../hooks/use-toast';

interface Order {
  id: string;
  customer_name: string;
  total: number;
  status: string;
  payment_status?: string;
  created_at: string;
  items?: string;
}

function PhonePePaymentContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed' | 'checking'>('pending');
  const supabase = createClient();

  const orderId = params.orderId as string;
  const txnId = searchParams.get('txnId');

  const fetchOrder = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      
      const orderData = data as Order;
      setOrder(orderData);
      
      // Check if payment is already completed
      if (orderData.payment_status === 'paid') {
        setPaymentStatus('success');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast({
        title: "Error",
        description: "Failed to load order details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [orderId, supabase, toast]);

  const checkPaymentStatus = useCallback(async (transactionId: string) => {
    try {
      setPaymentStatus('checking');
      
      const response = await fetch(`/api/payment/phonepe/status?transactionId=${transactionId}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        if (data.status === 'COMPLETED') {
          setPaymentStatus('success');
          toast({
            title: "Payment Successful!",
            description: "Your payment has been processed successfully.",
          });
          
          // Refresh order data
          await fetchOrder();
          
          // Redirect to order confirmation after a delay
          setTimeout(() => {
            router.push(`/orders/${orderId}`);
          }, 3000);
        } else if (data.status === 'FAILED') {
          setPaymentStatus('failed');
          toast({
            title: "Payment Failed",
            description: "Your payment could not be processed. Please try again.",
            variant: "destructive",
          });
        } else {
          setPaymentStatus('pending');
        }
      } else {
        setPaymentStatus('failed');
        toast({
          title: "Status Check Failed",
          description: "Could not verify payment status. Please contact support.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setPaymentStatus('failed');
      toast({
        title: "Error",
        description: "Failed to check payment status",
        variant: "destructive",
      });
    }
  }, [orderId, router, toast, fetchOrder]);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId, fetchOrder]);

  useEffect(() => {
    // If we have a transaction ID from callback, check status
    if (txnId) {
      checkPaymentStatus(txnId);
    }
  }, [txnId, checkPaymentStatus]);

  const initiatePhonePePayment = async () => {
    if (!order) return;
    
    setProcessing(true);
    try {
      const orderItems = JSON.parse(order.items || '{}');
      
      const response = await fetch('/api/payment/phonepe/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          amount: order.total,
          customerPhone: orderItems.customer_phone || '',
          customerEmail: orderItems.customer_email || ''
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        // Redirect to PhonePe payment page
        window.location.href = data.paymentUrl;
      } else {
        toast({
          title: "Payment Failed",
          description: data.error || "Failed to initiate payment",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error initiating payment:', error);
      toast({
        title: "Error",
        description: "Failed to initiate payment",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case 'failed':
        return <XCircle className="h-16 w-16 text-red-500" />;
      case 'checking':
        return <Clock className="h-16 w-16 text-blue-500 animate-pulse" />;
      default:
        return <Smartphone className="h-16 w-16 text-purple-500" />;
    }
  };

  const getStatusMessage = () => {
    switch (paymentStatus) {
      case 'success':
        return {
          title: "Payment Successful!",
          description: "Your payment has been processed successfully. You will be redirected to order confirmation shortly.",
          color: "text-green-600"
        };
      case 'failed':
        return {
          title: "Payment Failed",
          description: "Your payment could not be processed. Please try again or contact support.",
          color: "text-red-600"
        };
      case 'checking':
        return {
          title: "Verifying Payment...",
          description: "Please wait while we verify your payment status.",
          color: "text-blue-600"
        };
      default:
        return {
          title: "Pay with PhonePe",
          description: "Complete your payment securely with PhonePe.",
          color: "text-purple-600"
        };
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          <XCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h1>
          <p className="text-gray-600 mb-6">The order you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusMessage();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <Button 
          onClick={() => router.back()} 
          variant="ghost" 
          className="mb-6"
          disabled={processing || paymentStatus === 'checking'}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            <CardTitle className={`text-xl ${statusInfo.color}`}>
              {statusInfo.title}
            </CardTitle>
            <CardDescription className="text-center">
              {statusInfo.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Order Details */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Order Details</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-mono text-xs">{order.id.substring(0, 8)}...</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Customer:</span>
                  <span>{order.customer_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold">₹{order.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                    {order.payment_status === 'paid' ? 'Paid' : 'Pending'}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Payment Actions */}
            <div className="space-y-4">
              {paymentStatus === 'pending' && (
                <Button
                  onClick={initiatePhonePePayment}
                  disabled={processing}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {processing ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Initiating Payment...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Pay ₹{order.total.toFixed(2)} with PhonePe
                    </div>
                  )}
                </Button>
              )}

              {paymentStatus === 'checking' && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Checking payment status...</p>
                </div>
              )}

              {paymentStatus === 'success' && (
                <Button
                  onClick={() => router.push(`/orders/${orderId}`)}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  View Order Details
                </Button>
              )}

              {paymentStatus === 'failed' && (
                <div className="space-y-2">
                  <Button
                    onClick={initiatePhonePePayment}
                    disabled={processing}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <Smartphone className="h-4 w-4 mr-2" />
                    Retry Payment
                  </Button>
                  <Button
                    onClick={() => router.push('/')}
                    variant="outline"
                    className="w-full"
                  >
                    Continue Shopping
                  </Button>
                </div>
              )}
            </div>

            {/* Security Notice */}
            <div className="text-center text-xs text-gray-500 mt-6">
              <p>🔒 Payments are processed securely by PhonePe</p>
              <p>Your payment information is encrypted and secure</p>
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
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Clock className="h-16 w-16 text-blue-500 animate-pulse" />
            </div>
            <CardTitle className="text-xl text-blue-600">
              Loading Payment Information
            </CardTitle>
          </CardHeader>
          
          <CardContent className="text-center space-y-6">
            <p className="text-gray-600">
              Please wait while we prepare your payment details...
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

export default function PhonePePaymentPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PhonePePaymentContent />
    </Suspense>
  );
}
