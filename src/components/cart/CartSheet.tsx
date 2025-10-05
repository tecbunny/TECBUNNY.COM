
'use client';

import * as React from 'react';
import Link from 'next/link';

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
import { useCart } from '../../lib/hooks';
import { useAuth } from '../../lib/hooks';

import type { Coupon, CartItem, Discount } from '../../lib/types';
import { Input } from '../../components/ui/input';
import { useToast } from '../../hooks/use-toast';

import { createClient } from '../../lib/supabase/client';

import { logger } from '../../lib/logger';

import { CouponDialog } from './CouponDialog';
import { CartItemCard } from './CartItemCard';

interface CartSheetProps {
    children: React.ReactNode;
}

export function CartSheet({ children }: CartSheetProps) {
  const { cartItems, cartCount, cartSubtotal, cartGst, cartTotal, isSessionExpired, resetGuestSession } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  
  const [couponCode, setCouponCode] = React.useState('');
  const [appliedCoupon, setAppliedCoupon] = React.useState<Coupon | null>(null);
  const [allCoupons, setAllCoupons] = React.useState<Coupon[]>([]);
  const [discount, setDiscount] = React.useState(0); // coupon discount
  const [autoDiscount, setAutoDiscount] = React.useState(0);
  const [autoDiscountApplied, setAutoDiscountApplied] = React.useState<Discount | null>(null);
  const [applying, setApplying] = React.useState(false);
  const supabase = createClient();

  React.useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      const { data: coupons, error } = await supabase.from('coupons').select('*');
      if (error) {
        logger.error('Error fetching coupons:', { error });
        toast({ variant: 'destructive', title: 'Could not load coupons', description: 'There was an issue fetching available offers.' });
      } else {
        setAllCoupons(coupons as Coupon[]);
      }
      // Auto discounts
      const { data: discountsData, error: discErr } = await supabase.from('discounts').select('*').eq('status','active');
      if (!discErr && discountsData) {
        const now = new Date();
        let bestAmount = 0; let best: Discount | null = null;
        (discountsData as Discount[]).forEach(d => {
          const start = new Date(d.start_date); const end = new Date(d.expiry_date);
          if (now < start || now > end) return;
          let applicableTotal = 0;
          if (d.applicable_product_id) {
            const item = cartItems.find(i => i.id === d.applicable_product_id);
            applicableTotal = item ? item.price * item.quantity : 0;
          } else if (d.applicable_category) {
            applicableTotal = cartItems.filter(i => i.category === d.applicable_category).reduce((s,i)=>s+i.price*i.quantity,0);
          } else {
            applicableTotal = cartSubtotal;
          }
            if (d.min_purchase && applicableTotal < d.min_purchase) return;
            const amt = d.type === 'fixed' ? Math.min(d.value, applicableTotal) : (applicableTotal * d.value)/100;
            if (amt > bestAmount) { bestAmount = amt; best = d; }
        });
        setAutoDiscount(bestAmount);
        setAutoDiscountApplied(best);
      }
    };
    fetchData();
  }, [open, supabase, toast, cartItems, cartSubtotal]);


  const calculateDiscount = (coupon: Coupon, items: CartItem[], subtotal: number): number => {
    let applicableTotal = 0;
    if (coupon.applicable_product_id) {
        const item = items.find(i => i.id === coupon.applicable_product_id);
        applicableTotal = item ? item.price * item.quantity : 0;
    } else if (coupon.applicable_category) {
        applicableTotal = items.filter(i => i.category === coupon.applicable_category)
                               .reduce((sum, i) => sum + i.price * i.quantity, 0);
    } else {
        applicableTotal = subtotal; // Applies to entire cart
    }

    if (coupon.type === 'fixed') {
        return Math.min(coupon.value, applicableTotal);
    } else { // percentage
        return (applicableTotal * coupon.value) / 100;
    }
  };

  const isCouponValid = (coupon: Coupon, items: CartItem[], total: number): boolean => {
    const now = new Date();
    const expiryDate = new Date(coupon.expiry_date);
    const startDate = new Date(coupon.start_date);
    
    if (coupon.status !== 'active' || now < startDate || now > expiryDate) {
        return false;
    }
    
    const relevantTotal = coupon.applicable_category || coupon.applicable_product_id ? 
        items.filter(i => i.category === coupon.applicable_category || i.id === coupon.applicable_product_id)
             .reduce((sum, i) => sum + i.price * i.quantity, 0)
        : total;

    if (coupon.min_purchase && relevantTotal < coupon.min_purchase) {
        return false;
    }

    if (coupon.applicable_product_id) {
        return items.some(item => item.id === coupon.applicable_product_id);
    }
    if (coupon.applicable_category) {
        return items.some(item => item.category === coupon.applicable_category);
    }
    return true; // General coupon
  }

  const availableCoupons = React.useMemo(() => {
    return allCoupons.filter(coupon => isCouponValid(coupon, cartItems, cartTotal));
  }, [allCoupons, cartItems, cartTotal]);


  const handleApplyCoupon = (code: string) => {
    if (applying) return;
    setApplying(true);
    const couponToApply = allCoupons.find(c => c.code.toUpperCase() === code.toUpperCase());

    if (couponToApply && isCouponValid(couponToApply, cartItems, cartTotal)) {
        setAppliedCoupon(couponToApply);
        setCouponCode(couponToApply.code);
        toast({ title: 'Coupon Applied', description: `Successfully applied coupon: ${couponToApply.code}` });
    } else {
        setAppliedCoupon(null);
        toast({ variant: 'destructive', title: 'Invalid Coupon', description: 'This coupon is not valid for your current cart.' });
    }
    setTimeout(() => setApplying(false), 300);
  };

  const onCouponSelected = (coupon: Coupon | null) => {
    if (coupon) {
      handleApplyCoupon(coupon.code);
    } else {
      setAppliedCoupon(null);
      setCouponCode('');
    }
  };
  
  React.useEffect(() => {
    if (appliedCoupon && isCouponValid(appliedCoupon, cartItems, cartTotal)) {
        setDiscount(calculateDiscount(appliedCoupon, cartItems, cartTotal));
    } else if (appliedCoupon) { // If it was applied but is no longer valid
        setAppliedCoupon(null);
        setCouponCode('');
        setDiscount(0);
        toast({
            variant: 'destructive',
            title: 'Coupon Invalidated',
            description: `Coupon ${appliedCoupon.code} is no longer valid for your cart.`,
        });
    } else {
        setDiscount(0);
    }
  }, [appliedCoupon, cartItems, cartTotal, toast]);


  const finalTotal = cartTotal - discount - autoDiscount;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader className="px-6">
          <SheetTitle>Shopping Cart ({cartCount})</SheetTitle>
          {!user && (
            <div className="text-sm text-muted-foreground mt-2">
              {isSessionExpired ? (
                <div className="flex items-center justify-between bg-destructive/10 text-destructive p-2 rounded">
                  <span>Guest session expired</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={resetGuestSession}
                    className="ml-2"
                  >
                    Reset Session
                  </Button>
                </div>
              ) : (
                <div className="text-center text-xs bg-blue-50 text-blue-600 p-2 rounded">
                  Guest session - Cart will reset after 1 hour of inactivity
                </div>
              )}
            </div>
          )}
        </SheetHeader>
        <Separator className="my-4" />
        {cartCount > 0 ? (
          <>
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <ScrollArea className="flex-1 px-6">
                    <div className="flex flex-col gap-6">
                    {cartItems.map((item) => (
                        <CartItemCard key={item.id} item={item} />
                    ))}
                    </div>
                </ScrollArea>
                 <div className="px-6 space-y-4">
                    <div>
                        <h4 className="font-medium mb-2">Apply Discount Code</h4>
                        <div className="flex items-center gap-2">
                            <Input 
                                placeholder="Enter coupon code" 
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value)}
                            />
                            <Button onClick={() => handleApplyCoupon(couponCode)} disabled={!couponCode || applying}>Apply</Button>
                        </div>
                    </div>
                    <CouponDialog 
                        availableCoupons={availableCoupons}
                        onCouponSelected={onCouponSelected}
                        appliedCouponCode={appliedCoupon?.code}
                    />
                </div>
            </div>
            
            <SheetFooter className="px-6 bg-secondary/50 pt-4 pb-6 mt-auto">
                <div className="w-full space-y-2">
                    <div className="flex justify-between text-base">
                        <span>Subtotal</span>
                        <span>₹{cartSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base">
                        <span>GST</span>
                        <span>₹{cartGst.toFixed(2)}</span>
                    </div>
                     {autoDiscount > 0 && (
                        <div className="flex justify-between text-base text-green-600">
                          <span>Auto Discount{autoDiscountApplied ? ` (${autoDiscountApplied.name})` : ''}</span>
                          <span>- ₹{autoDiscount.toFixed(2)}</span>
                        </div>
                     )}
                     {discount > 0 && (
                        <div className="flex justify-between text-base text-destructive">
                            <span>Discount ({appliedCoupon?.code})</span>
                            <span>- ₹{discount.toFixed(2)}</span>
                        </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-lg font-semibold">
                        <span>Grand Total</span>
                        <span>₹{finalTotal < 0 ? '0.00' : finalTotal.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Shipping calculated at checkout.</p>
                    <Button className="w-full" size="lg" asChild>
                        <Link href="/checkout" onClick={() => setOpen(false)}>
                            Proceed to Checkout
                        </Link>
                    </Button>
                    <Button variant="outline" className="w-full" asChild>
                      <Link href="/" onClick={() => setOpen(false)}>Continue Shopping</Link>
                    </Button>
                </div>
            </SheetFooter>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <h3 className="text-xl font-semibold">Your cart is empty</h3>
            <p className="text-muted-foreground">
              Looks like you haven't added anything yet.
            </p>
            <Button asChild onClick={() => setOpen(false)}>
              <Link href="/">Start Shopping</Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}