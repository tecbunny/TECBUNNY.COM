
'use client';

import * as React from 'react';

import Image from 'next/image';

import { useCart } from '../../lib/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Separator } from '../../components/ui/separator';

export function OrderSummary() {
  const { cartItems, cartSubtotal, cartGst, cartTotal } = useCart();
  const shippingCost = cartTotal > 5000 ? 0 : 500; // Example: Free shipping over 5000
  const totalAmount = cartTotal + shippingCost;

  return (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
            {cartItems.map(item => (
                <div key={item.id} className="flex items-center gap-4">
                    <div className="relative h-16 w-16 rounded-md border">
                        <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />
                    </div>
                    <div className="flex-1">
                        <p className="font-medium text-sm leading-tight">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium">₹{(item.price * item.quantity).toFixed(2)}</p>
                </div>
            ))}
        </div>
        <Separator />
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>₹{cartSubtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">GST</span>
            <span>₹{cartGst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>{shippingCost > 0 ? `₹${shippingCost.toFixed(2)}` : 'Free'}</span>
          </div>
        </div>
        <Separator />
        <div className="flex justify-between font-bold text-lg">
          <span>Total</span>
          <span>₹{totalAmount.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
}