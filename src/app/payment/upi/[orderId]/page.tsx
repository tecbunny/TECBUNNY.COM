'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { ArrowLeft, Smartphone, Copy, Check, QrCode, Clock, CreditCard } from 'lucide-react';

import QRCode from 'qrcode';

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
  status: string;
  created_at: string;
  customers: {
    name: string;
    email: string;
  };
}

export default function UPIPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const supabase = createClient();

  // UPI ID for payments (configurable via env; fallback provided for dev)
  const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID || "9604136010@okbizaxis";

  const generateUPILink = useCallback(
    (currentOrder?: Order | null) => {
      const amount = currentOrder?.total_amount ?? order?.total_amount ?? 0;
      if (!orderId) return `upi://pay?pa=${UPI_ID}&pn=TecBunny Store&am=0&cu=INR&tn=Order`;
      return `upi://pay?pa=${UPI_ID}&pn=TecBunny Store&am=${amount}&cu=INR&tn=Order ${orderId}`;
    },
    [UPI_ID, order?.total_amount, orderId]
  );

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          payment_status,
          status,
          created_at,
          customers!inner(name, email)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      const fetchedOrder = data as unknown as Order;
      setOrder(fetchedOrder);
      setPaymentStatus(fetchedOrder.payment_status);

      const upiLink = generateUPILink(fetchedOrder);
      const qrDataUrl = await QRCode.toDataURL(upiLink, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      logger.error('Error fetching order for UPI payment page', { error, orderId });
      toast({
        title: "Error",
        description: "Failed to load order details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [generateUPILink, orderId, supabase, toast]);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    fetchOrder();
  }, [fetchOrder, orderId]);

  const copyUPIId = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "UPI ID copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenUPI = useCallback(() => {
    const link = generateUPILink();
    window.open(link, '_blank', 'noopener');
  }, [generateUPILink]);

  const handlePaymentConfirmation = async () => {
    try {
      // In a real app, you would verify payment through UPI gateway
      const { error } = await supabase
        .from('orders')
        .update({ 
          payment_status: 'paid',
          status: 'confirmed'
        })
        .eq('id', orderId);

      if (error) throw error;

      setPaymentStatus('paid');

      toast({
        title: "Payment Confirmed!",
        description: "Your payment has been received and order confirmed.",
      });

      // Redirect to order confirmation
      router.push(`/orders/${orderId}`);
    } catch (error) {
      logger.error('Error updating payment status after UPI confirmation', { error, orderId });
      toast({
        title: "Error",
        description: "Failed to confirm payment",
        variant: "destructive",
      });
    }
  };

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
        <h1 className="text-3xl font-bold">UPI Payment</h1>
        <p className="text-gray-600">Order #{order.id.slice(0, 8)}</p>
      </div>

      <div className="space-y-6">
        {/* Payment Amount */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-lg">Amount to Pay:</span>
              <span className="text-2xl font-bold text-green-600">₹{order.total_amount.toFixed(2)}</span>
            </div>
            <div className="mt-2">
              <Badge variant={paymentStatus === 'paid' ? 'default' : 'secondary'}>
                {paymentStatus.toUpperCase()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* UPI Payment Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Pay with UPI
            </CardTitle>
            <CardDescription>
              Choose your preferred payment method
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Direct UPI Link */}
            <div className="space-y-2">
              <h4 className="font-medium">Option 1: Direct UPI Payment</h4>
              <Button 
                onClick={handleOpenUPI}
                className="w-full"
                size="lg"
              >
                <Smartphone className="mr-2 h-4 w-4" />
                Pay with UPI App
              </Button>
              <p className="text-sm text-gray-600">
                This will open your UPI app with pre-filled payment details
              </p>
            </div>

            <Separator />

            {/* Manual UPI Transfer */}
            <div className="space-y-2">
              <h4 className="font-medium">Option 2: Manual Transfer</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">UPI ID:</p>
                    <p className="font-mono font-medium">{UPI_ID}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={copyUPIId}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Transfer ₹{order.total_amount.toFixed(2)} to the above UPI ID with reference: Order {order.id.slice(0, 8)}
              </p>
            </div>

            <Separator />

            {/* QR Code Section */}
            <div className="space-y-2">
              <h4 className="font-medium">Option 3: Scan QR Code</h4>
              <div className="flex items-center justify-center bg-gray-50 p-8 rounded-lg">
                <div className="text-center">
                  {qrCodeUrl ? (
                    <div className="space-y-2">
                      <img 
                        src={qrCodeUrl} 
                        alt="UPI Payment QR Code" 
                        className="mx-auto border rounded-lg shadow-sm"
                        width={200}
                        height={200}
                      />
                      <p className="text-sm text-gray-600">
                        Scan with any UPI app to pay ₹{order?.total_amount}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <QrCode className="h-24 w-24 mx-auto text-gray-400 mb-2 animate-pulse" />
                      <p className="text-sm text-gray-600">Generating QR Code...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Payment Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Complete the payment using any of the above methods</li>
              <li>Take a screenshot of the successful transaction</li>
              <li>Click "I have completed the payment" below</li>
              <li>Our team will verify the payment within 2-4 hours</li>
              <li>You'll receive a confirmation email once verified</li>
            </ol>
          </CardContent>
        </Card>

        {/* Payment Confirmation */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Button 
                onClick={handlePaymentConfirmation}
                className="w-full"
                size="lg"
                disabled={paymentStatus === 'paid'}
              >
                {paymentStatus === 'paid' ? 'Payment Confirmed' : 'I have completed the payment'}
              </Button>
              <p className="text-xs text-gray-500 text-center">
                By clicking above, you confirm that you have successfully completed the payment.
                Please ensure you have a valid transaction receipt.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
