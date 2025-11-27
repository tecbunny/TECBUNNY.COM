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
import { Input } from "../ui/input";

import { useToast } from "../../hooks/use-toast";

import { CartItemCard } from "./CartItemCard";
import { CouponDialog } from "./CouponDialog";

const formatCurrency = (value: number) =>
  value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CartPage() {
  const {
    cartItems,
    cartCount,
    cartSubtotal,
    cartGst,
    pricing,
    applyCoupon,
    removeCoupon,
    refreshPricing,
    isSessionExpired,
    resetGuestSession,
  } = useCart();
  const [applyingCouponId, setApplyingCouponId] = React.useState<string | null>(null);
  const [couponCode, setCouponCode] = React.useState("");
  const [applyingCode, setApplyingCode] = React.useState(false);
  const { toast } = useToast();

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

  const handleApplyCouponCode = async () => {
    const code = couponCode.trim();
    if (!code) {
      return;
    }

    const matchingCoupon = availableCoupons.find(
      (coupon) => coupon.code.toUpperCase() === code.toUpperCase()
    );

    if (!matchingCoupon) {
      toast({
        variant: "destructive",
        title: "Coupon not applicable",
        description: "This code is not valid for the current cart.",
      });
      return;
    }

    setApplyingCode(true);
    try {
      const applied = await applyCoupon(matchingCoupon);
      if (applied) {
        setCouponCode("");
      }
    } finally {
      setApplyingCode(false);
    }
  };

  const handleCouponSelected = (coupon: Coupon | null) => {
    if (!coupon) {
      removeCoupon();
      return;
    }

    void handleApplyCoupon(coupon);
  };

  const hasItems = cartItems.length > 0;
  const {
    finalTotal,
    autoOffer,
    autoOfferDiscount,
    appliedCoupon,
    couponDiscount,
    availableCoupons,
    totalDiscount,
    canCombineDiscounts,
  } = pricing;

  const subtotal = cartSubtotal;
  const gstAmount = cartGst;

  const { totalMrp, absoluteMrpDiscount, percentMrpDiscount } = React.useMemo(() => {
    const totals = cartItems.reduce(
      (acc, item) => {
        const itemMrp = typeof item.mrp === "number" && item.mrp > 0 ? item.mrp : item.price;
        acc.totalMrp += itemMrp * item.quantity;
        acc.totalSale += item.price * item.quantity;
        return acc;
      },
      { totalMrp: 0, totalSale: 0 }
    );

    const absoluteMrpDiscount = Math.max(0, totals.totalMrp - totals.totalSale);
    const percentMrpDiscount = totals.totalMrp > 0 ? (absoluteMrpDiscount / totals.totalMrp) * 100 : 0;

    return {
      totalMrp: totals.totalMrp,
      absoluteMrpDiscount,
      percentMrpDiscount,
    };
  }, [cartItems]);

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
                {absoluteMrpDiscount > 0 && (
                  <div className="rounded-md border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span>Total product discount</span>
                      <span>
                        ₹{formatCurrency(absoluteMrpDiscount)} ({percentMrpDiscount.toFixed(1)}% OFF)
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-orange-600">
                      You are saving against an MRP of ₹{formatCurrency(totalMrp)}.
                    </p>
                  </div>
                )}

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

                <div className="rounded-md border border-dashed p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Tag className="h-4 w-4" />
                      <span>Apply coupon</span>
                    </div>
                    {availableCoupons.length > 0 && (
                      <CouponDialog
                        availableCoupons={availableCoupons}
                        onCouponSelected={handleCouponSelected}
                        appliedCouponCode={appliedCoupon?.code}
                      />
                    )}
                  </div>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleApplyCouponCode();
                    }}
                    className="flex flex-col gap-2 sm:flex-row"
                  >
                    <Input
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(event) => setCouponCode(event.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="submit"
                      disabled={!couponCode || applyingCode}
                    >
                      {applyingCode ? "Applying..." : "Apply"}
                    </Button>
                  </form>
                  {availableCoupons.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No coupons are currently available for your cart. Add eligible items to unlock offers.
                    </p>
                  )}
                </div>

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
