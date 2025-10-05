'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { ArrowLeft, CreditCard, Smartphone, Banknote, Clock, CheckCircle } from 'lucide-react';

import { createClient } from '../../../../lib/supabase/client';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Separator } from '../../../../components/ui/separator';
import { useToast } from '../../../../hooks/use-toast';
import { logger } from '../../../../lib/logger';

interface Order {
  id: string;
  total_amount: number;
  payment_status: string;
  payment_method: string;
  status: string;
  created_at: string;
  customers: {
    name: string;
    email: string;
  };
}

export default function PaymentMethodPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const supabase = createClient();

  const paymentMethod = params.method as string;

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          payment_status,
          payment_method,
          status,
          created_at,
          customers!inner(name, email)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      setOrder(data as unknown as Order);
    } catch (error) {
      logger.error('Error fetching order for payment method page', { error, orderId });
      toast({
        title: "Error",
        description: "Failed to load order details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [orderId, supabase, toast]);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    fetchOrder();
  }, [fetchOrder, orderId]);

  const getPaymentMethodInfo = (method: string) => {
    switch (method.toLowerCase()) {
      case 'card':
        return {
          title: 'Credit/Debit Card Payment',
          icon: CreditCard,
          description: 'Pay securely with your credit or debit card',
          instructions: [
            'Enter your card details in the secure form below',
            'Ensure your card is enabled for online transactions',
            'You may receive an OTP for verification',
            'Payment will be processed instantly'
          ]
        };
      case 'netbanking':
        return {
          title: 'Net Banking Payment',
          icon: Banknote,
          description: 'Pay using your bank account',
          instructions: [
            'Select your bank from the list',
            'You will be redirected to your bank\'s website',
            'Login with your net banking credentials',
            'Authorize the payment and return to our site'
          ]
        };
      case 'wallet':
        return {
          title: 'Digital Wallet Payment',
          icon: Smartphone,
          description: 'Pay using your digital wallet',
          instructions: [
            'Select your preferred wallet',
            'Login to your wallet account',
            'Confirm the payment amount',
            'Complete the transaction'
          ]
        };
      case 'cod':
        return {
          title: 'Cash on Delivery',
          icon: CheckCircle,
          description: 'Pay when your order is delivered',
          instructions: [
            'Your order will be confirmed',
            'Pay the delivery person when your order arrives',
            'Have exact change ready',
            'COD charges may apply'
          ]
        };
      default:
        return {
          title: 'Payment',
          icon: CreditCard,
          description: 'Complete your payment',
          instructions: [
            'Follow the payment instructions',
            'Complete the payment process',
            'Wait for confirmation',
            'Check your email for receipt'
          ]
        };
    }
  };

  const handlePaymentProcess = async () => {
    setProcessing(true);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (paymentMethod.toLowerCase() === 'cod') {
        // For COD, just confirm the order
        const { error } = await supabase
          .from('orders')
          .update({ 
            status: 'confirmed',
            payment_status: 'cod_pending'
          })
          .eq('id', orderId);

        if (error) throw error;

        toast({
          title: "Order Confirmed!",
          description: "Your COD order has been confirmed. Pay when delivered.",
        });
      } else {
        // For other payment methods, simulate success
        const { error } = await supabase
          .from('orders')
          .update({ 
            payment_status: 'paid',
            status: 'confirmed'
          })
          .eq('id', orderId);

        if (error) throw error;

        toast({
          title: "Payment Successful!",
          description: "Your payment has been processed successfully.",
        });
      }

      // Redirect to order confirmation
      router.push(`/orders/${orderId}`);
    } catch (error) {
      logger.error('Error processing payment', { error, orderId, paymentMethod });
      toast({
        title: "Payment Failed",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const paymentInfo = getPaymentMethodInfo(paymentMethod);
  const PaymentIcon = paymentInfo.icon;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Order Not Found</CardTitle>
            <CardDescription>
              The order you're looking for doesn't exist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">{paymentInfo.title}</h1>
        <p className="text-gray-600">Order #{order.id.slice(0, 8)}</p>
      </div>

      <div className="space-y-6">
        {/* Payment Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PaymentIcon className="h-5 w-5" />
              Payment Summary
            </CardTitle>
            <CardDescription>{paymentInfo.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Order Total:</span>
                <span className="font-medium">₹{order.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <Badge variant="outline">{paymentMethod.toUpperCase()}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <Badge variant={order.payment_status === 'paid' ? 'default' : 'secondary'}>
                  {order.payment_status.toUpperCase()}
                </Badge>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Amount to Pay:</span>
                <span className="text-green-600">₹{order.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              How to Pay
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              {paymentInfo.instructions.map((instruction, index) => (
                <li key={index}>{instruction}</li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Payment Form/Button */}
        <Card>
          <CardContent className="pt-6">
            {paymentMethod.toLowerCase() === 'upi' ? (
              <div className="space-y-4">
                <Button 
                  onClick={() => router.push(`/payment/upi/${orderId}`)}
                  className="w-full"
                  size="lg"
                >
                  <Smartphone className="mr-2 h-4 w-4" />
                  Continue with UPI
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {paymentMethod.toLowerCase() === 'card' && (
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      Card payment gateway integration coming soon
                    </p>
                  </div>
                )}
                
                {paymentMethod.toLowerCase() === 'netbanking' && (
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <Banknote className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      Net banking integration coming soon
                    </p>
                  </div>
                )}
                
                {paymentMethod.toLowerCase() === 'wallet' && (
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <Smartphone className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      Digital wallet integration coming soon
                    </p>
                  </div>
                )}
                
                <Button 
                  onClick={handlePaymentProcess}
                  className="w-full"
                  size="lg"
                  disabled={processing || order.payment_status === 'paid'}
                >
                  {processing ? (
                    'Processing...'
                  ) : order.payment_status === 'paid' ? (
                    'Payment Completed'
                  ) : paymentMethod.toLowerCase() === 'cod' ? (
                    'Confirm COD Order'
                  ) : (
                    `Pay ₹${order.total_amount.toFixed(2)}`
                  )}
                </Button>
                
                {paymentMethod.toLowerCase() === 'cod' && (
                  <p className="text-xs text-gray-500 text-center">
                    COD charges: ₹50 (will be collected at delivery)
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Note */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Secure Payment</p>
                <p className="text-xs text-gray-600">
                  Your payment information is encrypted and secure. We never store your card details.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
