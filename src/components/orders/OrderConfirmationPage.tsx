'use client';

import { useCallback, useEffect, useState } from 'react';

import { CheckCircle, Package, MapPin, Phone, Mail, Calendar, Hash } from 'lucide-react';

import { formatOrderNumber } from '../../lib/order-utils';

import { useOrder } from '../../context/OrderProvider';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import type { Order } from '../../lib/types';

interface OrderConfirmationPageProps {
  orderId: string;
}

export default function OrderConfirmationPage({ orderId }: OrderConfirmationPageProps) {
  const { getOrderById } = useOrder();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      const fetchedOrder = await getOrderById(orderId);
      if (fetchedOrder) {
        setOrder(fetchedOrder);
      }
      setLoading(false);
    };

    fetchOrder();
  }, [orderId, getOrderById]);

  const handlePrint = useCallback(() => {
    if (typeof window === 'undefined') return;

    let mediaQuery: MediaQueryList | null = null;

    const cleanup = () => {
      document.body.classList.remove('order-print-active');
      window.removeEventListener('afterprint', cleanup);
      if (mediaQuery) {
        if (typeof mediaQuery.removeEventListener === 'function') {
          mediaQuery.removeEventListener('change', handleMediaChange);
        } else if (typeof mediaQuery.removeListener === 'function') {
          mediaQuery.removeListener(handleMediaChange);
        }
      }
    };

    const handleMediaChange = (event: MediaQueryListEvent) => {
      if (!event.matches) {
        cleanup();
      }
    };

    document.body.classList.add('order-print-active');

    if (window.matchMedia) {
      mediaQuery = window.matchMedia('print');
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleMediaChange);
      } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(handleMediaChange);
      }
    }

    window.addEventListener('afterprint', cleanup);
    window.print();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-6">The order you're looking for doesn't exist.</p>
          <Button 
            onClick={() => window.location.href = '/products'}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Awaiting Payment': return 'bg-amber-100 text-amber-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Confirmed': return 'bg-blue-100 text-blue-800';
      case 'Processing': return 'bg-purple-100 text-purple-800';
      case 'Shipped': return 'bg-indigo-100 text-indigo-800';
      case 'Delivered': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const normalizedPaymentMethod = order.payment_method?.toLowerCase() ?? '';
  const isPaymentConfirmed = (order.payment_status ?? '').toLowerCase() === 'payment confirmed'
    || ['Payment Confirmed', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Ready for Pickup', 'Completed', 'Delivered'].includes(order.status);
  const isAwaitingUpiConfirmation = normalizedPaymentMethod === 'upi'
    && !isPaymentConfirmed
    && ['Awaiting Payment', 'Pending'].includes(order.status);
  const statusLabel = isAwaitingUpiConfirmation
    ? 'Payment Confirmation Pending'
    : order.status;
  const paymentStatusLabel = (() => {
    const explicit = order.payment_status?.trim();
    if (explicit && explicit.length > 0) {
      return explicit;
    }

    if (['Cancelled', 'Rejected'].includes(order.status)) {
      return 'Payment Cancelled';
    }

    if (!isPaymentConfirmed) {
      return normalizedPaymentMethod === 'upi' ? 'Payment Confirmation Pending' : 'Awaiting Payment';
    }

    return 'Payment Confirmed';
  })();
  const paymentStatusTone = paymentStatusLabel === 'Payment Confirmed'
    ? 'text-green-600'
    : paymentStatusLabel === 'Payment Confirmation Pending'
      ? 'text-amber-600'
      : ['Payment Cancelled', 'Payment Failed'].includes(paymentStatusLabel)
        ? 'text-red-600'
        : 'text-gray-700';
  const paymentMethodLabel = order.payment_method
    ? order.payment_method.toUpperCase()
    : 'NOT SPECIFIED';
  const shouldShowRetryUpi = normalizedPaymentMethod === 'upi'
    && !isPaymentConfirmed
    && !['Cancelled', 'Rejected'].includes(order.status);

  return (
    <div className="min-h-screen bg-gray-50 py-8 order-print-page">
      <div id="order-print-area" className="max-w-4xl mx-auto px-4">
        {/* Success Header */}
        <div className="text-center mb-8">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-gray-600 mb-4">
            Thank you for your order. We'll send you a confirmation email shortly.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Hash className="h-4 w-4" />
            Order ID: {formatOrderNumber(order.id)}
          </div>
        </div>

  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Details
                </span>
                <Badge className={getStatusColor(order.status)}>
                  {statusLabel}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                Placed on {new Date(order.created_at).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium">Items Ordered:</h4>
                {order.items.map((item, index) => {
                  const gstRate = item.gstRate || 18;
                  const basePrice = item.price / (1 + (gstRate / 100));
                  const gstAmount = basePrice * (gstRate / 100);
                  
                  return (
                    <div key={index} className="flex justify-between items-start py-2 border-b border-gray-100 last:border-b-0">
                      <div className="flex-1">
                        <h5 className="font-medium text-sm">{item.name}</h5>
                        <p className="text-xs text-gray-500">
                          Qty: {item.quantity} × ₹{item.price.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-400">
                          HSN: {item.hsnCode} | GST ({gstRate}%): ₹{(gstAmount * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm">₹{(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST Amount</span>
                  <span>₹{order.gst_amount.toFixed(2)}</span>
                </div>
                {order.type === 'Delivery' && (
                  <div className="flex justify-between">
                    <span>Delivery Charges</span>
                    <span className="text-green-600">Free</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Payment Method</span>
                  <span>{paymentMethodLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Status</span>
                  <span className={`font-medium ${paymentStatusTone}`}>
                    {paymentStatusLabel}
                  </span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount</span>
                <span>₹{order.total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Customer & Delivery Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{order.customer_name}</p>
                  {order.customer_email && (
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {order.customer_email}
                    </p>
                  )}
                  {order.customer_phone && (
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {order.customer_phone}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {order.type === 'Delivery' ? 'Delivery Information' : 'Pickup Information'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.type === 'Delivery' ? (
                  <div>
                    <p className="font-medium mb-2">Delivery Address:</p>
                    <p className="text-sm text-gray-600">
                      {order.delivery_address || 'Address not provided'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium mb-2">Pickup Location:</p>
                    <p className="text-sm text-gray-600 whitespace-pre-line">
                      {(order.pickup_store || order.delivery_address || 'Shivparvati Enterprises, Chawdewada, Parcem, Pernem Goa.').trim()}
                    </p>
                    <p className="mt-3 text-xs text-gray-500">
                      Bring a valid ID and this confirmation email when collecting your order.
                    </p>
                  </div>
                )}
                
                {order.notes && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="font-medium mb-2">Order Notes:</p>
                    <p className="text-sm text-gray-600">{order.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center no-print">
          <Button
            onClick={() => window.location.href = '/products'}
            variant="outline"
            className="px-6"
          >
            Continue Shopping
          </Button>
          <Button
            onClick={() => window.location.href = '/orders'}
            className="bg-blue-600 hover:bg-blue-700 px-6"
          >
            View All Orders
          </Button>
          {shouldShowRetryUpi && (
            <Button
              onClick={() => window.location.href = `/payment/upi/${order.id}`}
              className="bg-purple-600 hover:bg-purple-700 px-6"
            >
              Retry UPI Payment
            </Button>
          )}
          <Button
            onClick={() => window.open(`/orders/${order.id}/invoice`, '_blank', 'noopener,noreferrer')}
            variant="outline"
            className="px-6"
          >
            View Invoice
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            className="px-6"
          >
            Print Order
          </Button>
        </div>

        {/* Next Steps */}
        <Card className="mt-8 no-print">
          <CardHeader>
            <CardTitle>What happens next?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">1</div>
                <p className="font-medium">Order Confirmation</p>
                <p className="text-gray-600">You'll receive an email confirmation shortly</p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">2</div>
                <p className="font-medium">{order.type === 'Delivery' ? 'Processing & Shipping' : 'Processing & Pickup'}</p>
                <p className="text-gray-600">
                  {order.type === 'Delivery' 
                    ? 'We\'ll process and ship your order' 
                    : 'We\'ll prepare your order for pickup'
                  }
                </p>
              </div>
              <div className="text-center">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">3</div>
                <p className="font-medium">{order.type === 'Delivery' ? 'Delivery' : 'Pickup'}</p>
                <p className="text-gray-600">
                  {order.type === 'Delivery' 
                    ? 'Your order will be delivered to your address' 
                    : 'Collect your order from our store'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}