'use client';

import React, { useState, useEffect } from 'react';

import { ShoppingCart, CreditCard, MapPin, User, Wallet, Banknote, QrCode } from 'lucide-react';

import { useCart, useAuth } from '../../lib/hooks';
import { useOrder } from '../../context/OrderProvider';
import { usePaymentMethods } from '../../hooks/use-payment-methods';
import { logger } from '../../lib/logger';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Separator } from '../../components/ui/separator';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { LoginDialog } from '../../components/auth/LoginDialog';
import type { OrderStatus, OrderType } from '../../lib/types';

const PICKUP_STORES = [
  {
    id: 'tecbunny-store-parcem',
    name: 'TecBunny Store Parcem',
    address: 'TecBunny Store, Chawdewada, Parcem, Pernem, Goa'
  }
] as const;

export default function CheckoutPage() {
  const { cartItems, cartCount } = useCart();
  const { createOrder, isProcessingOrder } = useOrder();
  const { getEnabledPaymentMethods, loading: paymentLoading } = usePaymentMethods();
  const { user, loading: authLoading } = useAuth();
  const pickupStores = PICKUP_STORES;
  
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
    state: '',
    notes: ''
  });
  
  const [orderType, setOrderType] = useState<OrderType>('Delivery');
  const [selectedPickupStoreId, setSelectedPickupStoreId] = useState<string>('tecbunny-store-parcem');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [orderError, setOrderError] = useState<string>('');
  const selectedPickupStore = pickupStores.find(store => store.id === selectedPickupStoreId) || pickupStores[0];

  const serviceOnlyCart = React.useMemo(() => {
    if (!cartItems.length) return false;
    return cartItems.every(item => item.product_type === 'service' || item.id.startsWith('service-'));
  }, [cartItems]);

  // Pre-fill user information when user data is available
  useEffect(() => {
    if (user) {
      setCustomerInfo(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        phone: user.mobile || '',
        address: user.address || '',
        // Keep existing values for city, pincode, state, notes if user doesn't have them
      }));
    }
  }, [user]);

  // Auto-select first available payment method
  useEffect(() => {
    if (!paymentLoading && !selectedPaymentMethod) {
      const enabledMethods = getEnabledPaymentMethods();
      if (enabledMethods.length > 0) {
        setSelectedPaymentMethod(enabledMethods[0].id);
      }
    }
  }, [paymentLoading, selectedPaymentMethod, getEnabledPaymentMethods]);

  // Clear error when payment method changes
  useEffect(() => {
    if (orderError && selectedPaymentMethod) {
      setOrderError('');
    }
  }, [selectedPaymentMethod, orderError]);

  useEffect(() => {
    if (orderType === 'Pickup' && !selectedPickupStore && PICKUP_STORES.length > 0) {
      setSelectedPickupStoreId(PICKUP_STORES[0].id);
    }
  }, [orderType, selectedPickupStore]);

  useEffect(() => {
    if (serviceOnlyCart && orderType !== 'Delivery') {
      setOrderType('Delivery');
    }
  }, [serviceOnlyCart, orderType]);

  const handleInputChange = (field: string, value: string) => {
    setCustomerInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((total, item) => {
      const price = item.price;
      const gstRate = item.gstRate || 18;
      const basePrice = price / (1 + (gstRate / 100));
      return total + basePrice * item.quantity;
    }, 0);

    const gstAmount = cartItems.reduce((total, item) => {
      const price = item.price;
      const gstRate = item.gstRate || 18;
      const basePrice = price / (1 + (gstRate / 100));
      const gst = basePrice * (gstRate / 100);
      return total + gst * item.quantity;
    }, 0);

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      gstAmount: Math.round(gstAmount * 100) / 100,
      total: Math.round((subtotal + gstAmount) * 100) / 100
    };
  };

  const { subtotal, gstAmount, total } = calculateTotals();

  const handlePlaceOrder = async () => {
    try {
      setOrderError('');

      if (!user) {
        setOrderError('Please log in to place an order.');
        return;
      }
      
      if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
        setOrderError('Please fill in all required fields (Name, Email, Phone)');
        return;
      }

      if (orderType === 'Delivery' && (!customerInfo.address || !customerInfo.city || !customerInfo.pincode)) {
        setOrderError('Please fill in delivery address details');
        return;
      }

      if (serviceOnlyCart && orderType === 'Pickup') {
        setOrderError('Service requests cannot be scheduled for store pickup. Please choose delivery.');
        setOrderType('Delivery');
        return;
      }

      if (!selectedPaymentMethod) {
        setOrderError('Please select a payment method');
        return;
      }

  const pickupAddress = selectedPickupStore ? selectedPickupStore.address : '';

      // Convert cart items to order items format
      const orderItems = cartItems.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        price: item.price,
        gstRate: item.gstRate || 18,
        hsnCode: item.hsnCode || '9999',
        name: item.name,
        serialNumbers: item.serialNumbers || []
      }));

      const paymentMethod = selectedPaymentMethod.toLowerCase();
      const initialStatus: OrderStatus = paymentMethod === 'upi' ? 'Awaiting Payment' : 'Pending';
      const initialPaymentStatus = (() => {
        if (paymentMethod === 'upi') {
          return 'Payment Confirmation Pending';
        }
        if (paymentMethod === 'cod') {
          return 'Payment Due on Delivery';
        }
        return 'Awaiting Payment';
      })();

      const orderData = {
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        type: serviceOnlyCart ? 'Delivery' : orderType,
        delivery_address: orderType === 'Delivery' ? 
          `${customerInfo.address}, ${customerInfo.city}, ${customerInfo.state} - ${customerInfo.pincode}` : 
          pickupAddress || undefined,
        pickup_store: orderType === 'Pickup' && !serviceOnlyCart ? pickupAddress : undefined,
        notes: customerInfo.notes,
        status: initialStatus,
        payment_method: paymentMethod,
        payment_status: initialPaymentStatus,
        subtotal,
        gst_amount: gstAmount,
        total,
        items: orderItems
      };

      let order = await createOrder(orderData);
      
      // If OrderProvider fails, try API endpoint as fallback
      if (!order) {
        try {
          const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData),
          });

          const data = await response.json();
          
          if (response.ok && data.success) {
            order = data.order;
          } else {
            logger.error('API order creation failed', { error: data.error, orderData });
          }
        } catch (apiError) {
          logger.error('API request failed', { error: apiError, orderData });
        }
      }
      
      if (order) {
        // Handle different payment methods
        if (selectedPaymentMethod === 'cod') {
          // Redirect to order confirmation page for COD
          window.location.href = `/orders/${order.id}`;
        } else if (selectedPaymentMethod === 'upi') {
          // Show UPI QR code or redirect to UPI payment
          window.location.href = `/payment/upi/${order.id}`;
        } else if (selectedPaymentMethod === 'phonepe') {
          // Redirect to PhonePe payment page
          window.location.href = `/payment/phonepe/${order.id}`;
        } else {
          // Redirect to other online payment gateway
          window.location.href = `/payment/${selectedPaymentMethod}/${order.id}`;
        }
      } else {
        setOrderError('Failed to create order. Please try again.');
      }
    } catch (error) {
      logger.error('Checkout order creation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      setOrderError('An error occurred while creating your order. Please try again.');
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-600">Checking your account...</div>
      </div>
    );
  }

  // Show empty cart message if no items
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <ShoppingCart className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Cart is Empty</h2>
          <p className="text-gray-600 mb-6">Add some products to your cart before checkout.</p>
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto max-w-3xl px-4">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">Login Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Please sign in to place your order. Items in your cart will be waiting for you after login.
              </p>
              {cartCount > 0 && (
                <p className="text-sm text-gray-500">
                  You currently have {cartCount} {cartCount === 1 ? 'item' : 'items'} in your cart.
                </p>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                <LoginDialog>
                  <Button size="lg" className="w-full sm:w-auto">
                    Login to Continue
                  </Button>
                </LoginDialog>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    window.location.href = '/auth/signup';
                  }}
                >
                  Create Account
                </Button>
              </div>
              <Button
                variant="ghost"
                className="w-full sm:w-auto"
                onClick={() => {
                  window.location.href = '/';
                }}
              >
                Continue Shopping
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
          <p className="text-gray-600">Review your order and complete your purchase</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Customer Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={customerInfo.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={customerInfo.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Enter your phone number"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Order Type & Delivery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="orderType">Order Type</Label>
                  <Select
                    value={orderType}
                    onValueChange={(value: OrderType) => setOrderType(value)}
                    disabled={serviceOnlyCart}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select order type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Delivery">Home Delivery</SelectItem>
                      {!serviceOnlyCart && (
                        <SelectItem value="Pickup">Store Pickup</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {serviceOnlyCart && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Store pickup is unavailable for service requests. Our team will contact you after scheduling.
                    </p>
                  )}
                </div>

                {orderType === 'Delivery' && (
                  <>
                    <div>
                      <Label htmlFor="address">Address *</Label>
                      <Textarea
                        id="address"
                        value={customerInfo.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="Enter your complete address"
                        rows={3}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          value={customerInfo.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          placeholder="City"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          value={customerInfo.state}
                          onChange={(e) => handleInputChange('state', e.target.value)}
                          placeholder="State"
                        />
                      </div>
                      <div>
                        <Label htmlFor="pincode">Pincode *</Label>
                        <Input
                          id="pincode"
                          value={customerInfo.pincode}
                          onChange={(e) => handleInputChange('pincode', e.target.value)}
                          placeholder="Pincode"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {orderType === 'Pickup' && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="pickupStore">Pickup Store</Label>
                      <Select
                        value={selectedPickupStoreId}
                        onValueChange={(value) => setSelectedPickupStoreId(value)}
                      >
                        <SelectTrigger id="pickupStore">
                          <SelectValue placeholder="Select pickup store" />
                        </SelectTrigger>
                        <SelectContent>
                          {pickupStores.map((store) => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-700">
                      <p className="font-medium">Pickup Address</p>
                      <p>{selectedPickupStore?.address || PICKUP_STORES[0].address}</p>
                      <p className="mt-2 text-xs text-gray-500">Bring a valid ID and your order confirmation email when collecting your order.</p>
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="notes">Order Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={customerInfo.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Any special instructions for your order"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Method Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentLoading ? (
                  <div className="text-center py-4">Loading payment methods...</div>
                ) : (
                  <RadioGroup 
                    value={selectedPaymentMethod} 
                    onValueChange={setSelectedPaymentMethod}
                    className="space-y-3"
                  >
                    {getEnabledPaymentMethods().map((method) => {
                      const getPaymentIcon = (methodId: string) => {
                        switch (methodId) {
                          case 'cod':
                            return <Banknote className="h-5 w-5 text-green-600" />;
                          case 'upi':
                            return <QrCode className="h-5 w-5 text-purple-600" />;
                          case 'razorpay':
                          case 'stripe':
                          case 'phonepe':
                          case 'cashfree':
                            return <CreditCard className="h-5 w-5 text-blue-600" />;
                          default:
                            return <Wallet className="h-5 w-5 text-gray-600" />;
                        }
                      };

                      return (
                        <div key={method.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                          <RadioGroupItem value={method.id} id={method.id} />
                          <Label htmlFor={method.id} className="flex-1 cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getPaymentIcon(method.id)}
                                <div>
                                  <p className="font-medium">{method.name}</p>
                                  <p className="text-sm text-gray-500">
                                    {method.type === 'online' ? 'Pay online securely' : 
                                     method.id === 'cod' ? 'Pay when your order is delivered' :
                                     method.id === 'upi' ? 'Pay using UPI apps' : 'Offline payment'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                {method.type === 'online' && (
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    Online
                                  </span>
                                )}
                                {method.id === 'cod' && (
                                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                    No extra charges
                                  </span>
                                )}
                                {method.id === 'upi' && (
                                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                    Instant
                                  </span>
                                )}
                              </div>
                            </div>
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                )}
                
                {!paymentLoading && getEnabledPaymentMethods().length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <p>No payment methods available.</p>
                    <p className="text-sm">Please contact support for assistance.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {cartItems.map((item) => {
                    const gstRate = item.gstRate || 18;
                    const basePrice = item.price / (1 + (gstRate / 100));
                    const gstAmount = basePrice * (gstRate / 100);
                    
                    return (
                      <div key={item.id} className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{item.name}</h4>
                          <p className="text-xs text-gray-500">
                            Qty: {item.quantity} × ₹{item.price.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-400">
                            GST ({gstRate}%): ₹{(gstAmount * item.quantity).toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal ({cartCount} items)</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST Amount</span>
                    <span>₹{gstAmount.toFixed(2)}</span>
                  </div>
                  {orderType === 'Delivery' && (
                    <div className="flex justify-between">
                      <span>Delivery Charges</span>
                      <span className="text-green-600">Free</span>
                    </div>
                  )}
                  {selectedPaymentMethod && (
                    <div className="flex justify-between">
                      <span>Payment Method</span>
                      <span className="font-medium">
                        {getEnabledPaymentMethods().find(m => m.id === selectedPaymentMethod)?.name || selectedPaymentMethod}
                      </span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>

                {orderError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-red-600 text-sm font-medium">{orderError}</p>
                  </div>
                )}

                <Button
                  onClick={handlePlaceOrder}
                  disabled={isProcessingOrder || !selectedPaymentMethod || paymentLoading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isProcessingOrder ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing Order...
                    </div>
                  ) : !selectedPaymentMethod ? 'Select Payment Method' :
                   selectedPaymentMethod === 'cod' ? `Place Order - ₹${total.toFixed(2)} (COD)` :
                   selectedPaymentMethod === 'upi' ? `Pay ₹${total.toFixed(2)} via UPI` :
                   `Pay ₹${total.toFixed(2)} Online`}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  By placing this order, you agree to our Terms & Conditions
                  {selectedPaymentMethod && getEnabledPaymentMethods().find(m => m.id === selectedPaymentMethod)?.type === 'online' && (
                    <><br />🔒 Your payment information is encrypted and secure</>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}