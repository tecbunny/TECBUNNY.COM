/**
 * Paytm Payment Page
 * Handles Paytm payment initiation and form submission
 */

'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { useToast } from '../../../hooks/use-toast';

interface PaytmInitiateResponse {
  txnToken: string;
  orderId: string;
  mid: string;
  amount: string;
  paymentUrl: string;
  environment: string;
}

function PaytmPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');
  
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [paytmData, setPaytmData] = React.useState<PaytmInitiateResponse | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (!orderId || !amount) {
      toast({
        title: 'Error',
        description: 'Invalid payment request. Missing order details.',
        variant: 'destructive'
      });
      router.push('/orders');
    }
  }, [orderId, amount, router, toast]);

  const handleInitiatePayment = async () => {
    if (!customerPhone || customerPhone.length !== 10) {
      toast({
        title: 'Error',
        description: 'Please enter a valid 10-digit phone number',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/payment/paytm/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          amount,
          customerPhone
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate payment');
      }

      setPaytmData(data);

      // Auto-submit form after setting data
      setTimeout(() => {
        if (formRef.current) {
          formRef.current.submit();
        }
      }, 500);

    } catch (error) {
      toast({
        title: 'Payment Initiation Failed',
        description: error instanceof Error ? error.message : 'Unable to start payment process',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Paytm Payment</CardTitle>
          <CardDescription>
            Complete your payment securely through Paytm
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!paytmData ? (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order ID:</span>
                  <span className="font-medium">{orderId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium text-lg">₹{amount}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer-phone">Mobile Number</Label>
                <Input
                  id="customer-phone"
                  type="tel"
                  placeholder="Enter 10-digit mobile number"
                  maxLength={10}
                  value={customerPhone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  This number will be used for payment confirmation
                </p>
              </div>

              <Button 
                onClick={handleInitiatePayment} 
                disabled={loading || !customerPhone}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Proceed to Paytm Payment'
                )}
              </Button>
            </>
          ) : (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Redirecting to Paytm payment page...</p>
              
              {/* Hidden form for Paytm redirect */}
              <form 
                ref={formRef}
                method="post" 
                action={`${paytmData.paymentUrl}?mid=${paytmData.mid}&orderId=${paytmData.orderId}`}
                style={{ display: 'none' }}
              >
                <input type="hidden" name="mid" value={paytmData.mid} />
                <input type="hidden" name="orderId" value={paytmData.orderId} />
                <input type="hidden" name="txnToken" value={paytmData.txnToken} />
              </form>
            </div>
          )}

          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground text-center">
              Powered by Paytm • Secure Payment Gateway
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaytmPaymentPage() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <PaytmPaymentContent />
    </React.Suspense>
  );
}
