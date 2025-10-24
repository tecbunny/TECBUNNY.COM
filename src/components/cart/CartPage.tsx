"use client";

import * as React from "react";
import Link from "next/link";
import { Gift, ShoppingCart, Tag } from "lucide-react";

import { useCart } from "../../lib/hooks";
import type { Coupon } from "../../lib/types";
import { Button } from "../ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Badge } from "../ui/badge";

import { CartItemCard } from "./CartItemCard";

const formatCurrency = (value: number) =>
  value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CartPage() {
  const {
    cartItems,
    cartCount,
    pricing,
    applyCoupon,
    removeCoupon,
    refreshPricing,
    isSessionExpired,
    resetGuestSession,
  } = useCart();
  const [applyingCouponId, setApplyingCouponId] = React.useState<string | null>(null);

  React.useEffect(() => {
    void refreshPricing();
  }, [refreshPricing]);

  const handleApplyCoupon = async (coupon: Coupon) => {
    setApplyingCouponId(coupon.id);
    try {
      await applyCoupon(coupon);
    } finally {
      setApplyingCouponId(null);
    }
  };

  const hasItems = cartItems.length > 0;
  const {
    subtotal,
    gstAmount,
    finalTotal,
    autoOffer,
    autoOfferDiscount,
    appliedCoupon,
    couponDiscount,
    availableCoupons,
    totalDiscount,
    canCombineDiscounts,
  } = pricing;

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Your Shopping Cart</h1>
            <p className="text-sm text-muted-foreground">
              Review your items and proceed to our secure checkout in a single click.
            </p>
          </div>
          {hasItems && (
            <Button variant="outline" asChild>
              <Link href="/products">Continue Shopping</Link>
            </Button>
          )}
        </div>

        {isSessionExpired && (
          <Alert variant="destructive">
            <AlertTitle>Session expired</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              Guest carts reset after a period of inactivity. Reset the cart to start again.
              <Button size="sm" onClick={resetGuestSession} variant="outline">
                Reset Cart
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {hasItems ? (
          <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Cart Items ({cartCount})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {cartItems.map((item, index) => (
                  <React.Fragment key={item.id}>
                    <CartItemCard item={item} />
                    {index < cartItems.length - 1 && <Separator />}
                  </React.Fragment>
                ))}
              </CardContent>
            </Card>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST</span>
                    <span>₹{formatCurrency(gstAmount)}</span>
                  </div>
                  {autoOffer && autoOfferDiscount > 0 && (
                    <div className="rounded-md border border-green-200 bg-green-50 p-3 text-xs text-green-700">
                      <div className="flex items-center justify-between text-sm">
                        <span>{autoOffer.title}</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          -₹{formatCurrency(autoOfferDiscount)}
                        </Badge>
                      </div>
                      {autoOffer.description && (
                        <p className="mt-2 leading-relaxed">{autoOffer.description}</p>
                      )}
                    </div>
                  )}
                  {appliedCoupon && (
                    <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          <span>{appliedCoupon.code}</span>
                        </div>
                        <Button size="sm" variant="ghost" onClick={removeCoupon} className="h-7 px-2">
                          Remove
                        </Button>
                      </div>
                      <p className="mt-2 leading-relaxed">
                        Coupon savings: ₹{formatCurrency(couponDiscount)}
                      </p>
                    </div>
                  )}
                </div>

                {availableCoupons.length > 0 && !appliedCoupon && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Available Coupons</p>
                    <div className="space-y-2">
                      {availableCoupons.map((coupon) => (
                        <div
                          key={coupon.id}
                          className="flex items-center justify-between rounded-md border border-dashed p-3 text-sm"
                        >
                          <div>
                            <span className="font-semibold">{coupon.code}</span>
                            <p className="text-xs text-muted-foreground">
                              {coupon.type === "percentage"
                                ? `${coupon.value}% off`
                                : `Flat ₹${formatCurrency(coupon.value)} off`}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleApplyCoupon(coupon)}
                            disabled={applyingCouponId === coupon.id}
                          >
                            {applyingCouponId === coupon.id ? "Applying..." : "Apply"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {totalDiscount > 0 && (
                  <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                    <p>
                      Total savings: ₹{formatCurrency(totalDiscount)}
                      {canCombineDiscounts ? " (offers + coupons combined)" : ""}
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <div className="flex w-full items-center justify-between text-lg font-semibold">
                  <span>Amount Payable</span>
                  <span>₹{formatCurrency(finalTotal)}</span>
                </div>
                <Button className="w-full" size="lg" asChild>
                  <Link href="/checkout">Proceed to Checkout</Link>
                </Button>
                <Button className="w-full" variant="outline" asChild>
                  <Link href="/products">Keep Shopping</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <Gift className="h-12 w-12 text-muted-foreground" />
            <h2 className="text-2xl font-semibold">Your cart is empty</h2>
            <p className="text-sm text-muted-foreground">
              Browse our catalogue and add products to start the checkout process.
            </p>
            <Button asChild>
              <Link href="/products">Explore Products</Link>
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
