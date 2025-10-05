'use client';

import * as React from 'react';
import Link from 'next/link';

import { Gift, Tag, X, Sparkles } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '../../components/ui/sheet';
import { Button } from '../../components/ui/button';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Separator } from '../../components/ui/separator';
import { Badge } from '../../components/ui/badge';
import { useCart } from '../../lib/hooks';

import type { Coupon } from '../../lib/types';
import { Input } from '../../components/ui/input';
import { useToast } from '../../hooks/use-toast';

import { CartItemCard } from './CartItemCard';
import { CouponDialog } from './CouponDialog';

interface EnhancedCartSheetProps {
    children: React.ReactNode;
}

export function EnhancedCartSheet({ children }: EnhancedCartSheetProps) {
  const { cartItems, cartCount, cartSubtotal, cartGst, cartTotal } = useCart();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [couponCode, setCouponCode] = React.useState('');
  const [appliedCoupon, setAppliedCoupon] = React.useState<Coupon | null>(null);
  const [availableCoupons] = React.useState<Coupon[]>([]);
  const [discount, setDiscount] = React.useState(0);
  const [autoOfferDiscount, setAutoOfferDiscount] = React.useState(0);
  const [autoOffer, setAutoOffer] = React.useState<{title: string; description: string} | null>(null);

  React.useEffect(() => {
    // Simulate auto-offer detection
    if (cartItems.length > 0) {
      // Sample auto-offer logic
      if (cartTotal > 5000) {
        setAutoOffer({
          title: "Minimum Order Offer",
          description: "Get ₹500 off on orders above ₹5000"
        });
        setAutoOfferDiscount(500);
      } else if (cartItems.some(item => item.category === 'Laptops')) {
        setAutoOffer({
          title: "Laptop Category Offer",
          description: "20% off on all laptops"
        });
        setAutoOfferDiscount(cartTotal * 0.2);
      } else {
        setAutoOffer(null);
        setAutoOfferDiscount(0);
      }
    } else {
      setAutoOffer(null);
      setAutoOfferDiscount(0);
    }
  }, [cartItems, cartTotal]);

  const handleApplyCoupon = async (code: string) => {
    if (!code.trim()) return;
    
    // Simple coupon validation (in real app, would call API)
    const mockCoupon = {
      id: '1',
      code: code.toUpperCase(),
      type: 'percentage' as const,
      value: 10,
      start_date: '2025-01-01',
      expiry_date: '2025-12-31',
      status: 'active' as const,
      usage_limit: 100,
      usage_count: 0,
      per_user_limit: 1
    };
    
    setAppliedCoupon(mockCoupon);
    setDiscount(cartTotal * 0.1); // 10% discount
    setCouponCode('');
    
    toast({
      title: "Coupon Applied!",
      description: `${code} has been applied to your cart.`,
    });
  };

  const onCouponSelected = async (coupon: Coupon | null) => {
    if (coupon) {
      setAppliedCoupon(coupon);
      setDiscount(cartTotal * (coupon.value / 100));
      toast({
        title: "Coupon Applied!",
        description: `${coupon.code} has been applied to your cart.`,
      });
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscount(0);
    setCouponCode('');
    toast({
      title: "Coupon Removed",
      description: "The coupon has been removed from your cart.",
    });
  };

  const totalDiscount = autoOfferDiscount + discount;
  const finalTotal = Math.max(0, cartTotal - totalDiscount + cartGst);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader className="px-6">
          <SheetTitle>Shopping Cart ({cartCount})</SheetTitle>
        </SheetHeader>
        <Separator className="my-4" />
        
        {cartCount > 0 ? (
          <>
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              {/* Cart Items */}
              <ScrollArea className="flex-1 px-6">
                <div className="flex flex-col gap-6">
                  {cartItems.map((item) => (
                    <CartItemCard key={item.id} item={item} />
                  ))}
                </div>
              </ScrollArea>
              
              {/* Offers and Discounts Section */}
              <div className="px-6 space-y-4">
                {/* Auto-Applied Offer */}
                {autoOffer && autoOfferDiscount > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-800">Auto-Applied Offer</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        ₹{autoOfferDiscount.toFixed(2)} OFF
                      </Badge>
                    </div>
                    <p className="text-sm text-green-700">{autoOffer.title}</p>
                    <p className="text-xs text-green-600 mt-1">{autoOffer.description}</p>
                  </div>
                )}
                
                {/* Applied Coupon */}
                {appliedCoupon && discount > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-800">Applied Discount</span>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          {appliedCoupon.code}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveCoupon}
                        className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-700">
                        {appliedCoupon.type === 'fixed' 
                          ? `₹${appliedCoupon.value} off`
                          : `${appliedCoupon.value}% off`
                        }
                      </span>
                      <span className="font-medium text-blue-800">
                        -₹{discount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Combination Notice */}
                {autoOffer && appliedCoupon && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                    <p className="text-xs text-yellow-700 text-center">
                      🎉 Great! Your offer and discount are combined for maximum savings
                    </p>
                  </div>
                )}
                
                {/* Coupon Input */}
                {!appliedCoupon && (
                  <div>
                    <h4 className="font-medium mb-2">Apply Discount Code</h4>
                    <div className="flex items-center gap-2">
                      <Input 
                        placeholder="Enter coupon code" 
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleApplyCoupon(couponCode);
                          }
                        }}
                      />
                      <Button 
                        onClick={() => handleApplyCoupon(couponCode)} 
                        disabled={!couponCode.trim()}
                        size="sm"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Available Coupons Dialog */}
                {availableCoupons.length > 0 && !appliedCoupon && (
                  <CouponDialog 
                    availableCoupons={availableCoupons}
                    onCouponSelected={onCouponSelected}
                    appliedCouponCode={undefined}
                  />
                )}
              </div>
            </div>
            
            {/* Cart Summary */}
            <SheetFooter className="px-6 bg-secondary/50 pt-4 pb-6 mt-auto">
              <div className="w-full space-y-2">
                <div className="flex justify-between text-base">
                  <span>Subtotal</span>
                  <span>₹{cartSubtotal.toFixed(2)}</span>
                </div>
                
                {/* Auto Offer Discount */}
                {autoOfferDiscount > 0 && (
                  <div className="flex justify-between text-base text-green-600">
                    <span>Auto Offer ({autoOffer?.title})</span>
                    <span>-₹{autoOfferDiscount.toFixed(2)}</span>
                  </div>
                )}
                
                {/* Manual Coupon Discount */}
                {discount > 0 && (
                  <div className="flex justify-between text-base text-blue-600">
                    <span>Discount ({appliedCoupon?.code})</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                )}
                
                {/* Total Savings */}
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-base font-medium text-green-700 bg-green-50 px-2 py-1 rounded">
                    <span>Total Savings</span>
                    <span>₹{totalDiscount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-base">
                  <span>GST</span>
                  <span>₹{cartGst.toFixed(2)}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between text-lg font-semibold">
                  <span>Grand Total</span>
                  <span>₹{finalTotal.toFixed(2)}</span>
                </div>
                
                <p className="text-xs text-muted-foreground">Shipping calculated at checkout.</p>
                
                <Button className="w-full" size="lg" asChild>
                  <Link href="/checkout">Proceed to Checkout</Link>
                </Button>
              </div>
            </SheetFooter>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <Gift className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Your cart is empty</h3>
            <p className="text-muted-foreground mb-6">Add some products to get started!</p>
            <Button asChild>
              <Link href="/products">Continue Shopping</Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}