'use client';

import React, { createContext, useState, useEffect, useCallback } from 'react';

import type { Product, CartItem, CustomerCategory, AutoOffer, Coupon } from '../lib/types';
import { useToast } from '../hooks/use-toast';
import { offerDiscountService } from '../lib/offer-discount-service';
import { useAuth } from '../lib/hooks';
import { logger } from '../lib/logger';

interface CartPricing {
  subtotal: number;
  autoOffer: AutoOffer | null;
  autoOfferDiscount: number;
  appliedCoupon: Coupon | null;
  couponDiscount: number;
  totalDiscount: number;
  gstAmount: number;
  finalTotal: number;
  availableCoupons: Coupon[];
  canCombineDiscounts: boolean;
}

interface CartContextType {
  cartItems: CartItem[];
  pricing: CartPricing;
  addToCart: (item: Product, quantity?: number) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  applyCoupon: (coupon: Coupon) => Promise<boolean>;
  removeCoupon: () => void;
  refreshPricing: (currentAppliedCoupon?: Coupon | null) => Promise<void>;
  cartCount: number;
  cartSubtotal: number;
  cartGst: number;
  cartTotal: number;
  isSessionExpired: boolean;
  resetGuestSession: () => void;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

const GUEST_SESSION_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

export const CartProvider: React.FC<{ 
  children: React.ReactNode;
  customerCategory?: CustomerCategory;
}> = ({ children, customerCategory }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [pricing, setPricing] = useState<CartPricing>({
    subtotal: 0,
    autoOffer: null,
    autoOfferDiscount: 0,
    appliedCoupon: null,
    couponDiscount: 0,
    totalDiscount: 0,
    gstAmount: 0,
    finalTotal: 0,
    availableCoupons: [],
    canCombineDiscounts: false,
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const [isHydrated, setIsHydrated] = useState(false);

  // Check if guest session is expired
  const isGuestSessionExpired = useCallback(() => {
    if (user) return false; // Logged-in users don't have session expiry
    
    const sessionStart = localStorage.getItem('guestSessionStart');
    if (!sessionStart) return false;
    
    const sessionStartTime = parseInt(sessionStart);
    const now = Date.now();
    
    return (now - sessionStartTime) > GUEST_SESSION_DURATION;
  }, [user]);

  // Initialize guest session
  const initializeGuestSession = useCallback(() => {
    if (user) return; // Only for guest users
    
    const existingSession = localStorage.getItem('guestSessionStart');
    if (!existingSession) {
      localStorage.setItem('guestSessionStart', Date.now().toString());
    }
  }, [user]);

  // Reset guest session
  const resetGuestSession = useCallback(() => {
    if (user) return; // Only affects guest users
    
    localStorage.removeItem('guestSessionStart');
    localStorage.removeItem('cart');
    localStorage.removeItem('appliedCoupon');
    localStorage.removeItem('cartLastUpdated');
    localStorage.removeItem('abandonedEmailSent');
    
    setCartItems([]);
    setPricing({
      subtotal: 0,
      autoOffer: null,
      autoOfferDiscount: 0,
      appliedCoupon: null,
      couponDiscount: 0,
      totalDiscount: 0,
      gstAmount: 0,
      finalTotal: 0,
      availableCoupons: [],
      canCombineDiscounts: false,
    });
    setIsSessionExpired(false);
    
    toast({
      title: "Session Reset",
      description: "Your guest session has been reset. Your cart is now empty.",
      variant: "default",
    });
  }, [user, toast]);

  // Get storage key based on user status
  const getStorageKey = useCallback((key: string) => {
    if (user) {
      return `${key}_user_${user.id}`;
    }
    return `${key}_guest`;
  }, [user]);

  // Load cart from storage with session check
  const loadCartFromStorage = useCallback(() => {
    try {
      // Check if guest session expired
      if (!user && isGuestSessionExpired()) {
        setIsSessionExpired(true);
        resetGuestSession();
        return;
      }

      const cartKey = getStorageKey('cart');
      const couponKey = getStorageKey('appliedCoupon');
      
      const storedCart = localStorage.getItem(cartKey);
      const storedCoupon = localStorage.getItem(couponKey);
      
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);
        setCartItems(parsedCart);
      }
      
      if (storedCoupon) {
        const coupon = JSON.parse(storedCoupon);
        setPricing(prev => ({ ...prev, appliedCoupon: coupon }));
      }

      // Initialize guest session if needed
      initializeGuestSession();
      
    } catch (error) {
      logger.error("Failed to parse cart from localStorage", { error });
      resetGuestSession();
    }
  }, [user, isGuestSessionExpired, resetGuestSession, getStorageKey, initializeGuestSession]);

  // Save cart to storage
  const saveCartToStorage = useCallback(() => {
    if (!isHydrated) return;
    
    // Don't save if session is expired
    if (!user && isGuestSessionExpired()) {
      setIsSessionExpired(true);
      return;
    }

    const cartKey = getStorageKey('cart');
    const couponKey = getStorageKey('appliedCoupon');
    
    localStorage.setItem(cartKey, JSON.stringify(cartItems));
    
    if (pricing.appliedCoupon) {
      localStorage.setItem(couponKey, JSON.stringify(pricing.appliedCoupon));
    } else {
      localStorage.removeItem(couponKey);
    }
    
    // Update cart timestamp for session tracking
    if (cartItems.length > 0) {
      const timestampKey = getStorageKey('cartLastUpdated');
      localStorage.setItem(timestampKey, new Date().toISOString());
    }
  }, [isHydrated, cartItems, pricing.appliedCoupon, getStorageKey, user, isGuestSessionExpired]);

  // Load cart on component mount and when user changes
  useEffect(() => {
    loadCartFromStorage();
    setIsHydrated(true);
  }, [user, loadCartFromStorage]); // Reload when user changes (login/logout)

  // Set up session expiry check for guest users
  useEffect(() => {
    if (user || !isHydrated) return; // Only for guest users
    
    const checkSessionExpiry = () => {
      if (isGuestSessionExpired()) {
        setIsSessionExpired(true);
        resetGuestSession();
      }
    };

    // Check session expiry every minute
    const interval = setInterval(checkSessionExpiry, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user, isHydrated, isGuestSessionExpired, resetGuestSession]);

  // Calculate pricing whenever cart or customer category changes
  const refreshPricing = useCallback(async (currentAppliedCoupon?: Coupon | null) => {
    // Don't calculate pricing if session is expired
    if (!user && isGuestSessionExpired()) {
      setIsSessionExpired(true);
      return;
    }

    // Use the passed coupon or current applied coupon
    const appliedCoupon = currentAppliedCoupon !== undefined ? currentAppliedCoupon : pricing.appliedCoupon;

    if (cartItems.length === 0) {
      setPricing({
        subtotal: 0,
        autoOffer: null,
        autoOfferDiscount: 0,
        appliedCoupon,
        couponDiscount: 0,
        totalDiscount: 0,
        gstAmount: 0,
        finalTotal: 0,
        availableCoupons: [],
        canCombineDiscounts: false,
      });
      return;
    }

    try {
      const pricingData = await offerDiscountService.calculateCartPricing(
        cartItems,
        customerCategory,
        appliedCoupon || undefined
      );

      // Calculate GST on final amount
      const gstAmount = cartItems.reduce((total, item) => {
        const gstRate = item.gstRate || 18;
        const itemTotal = item.price * item.quantity;
        const basePrice = itemTotal / (1 + (gstRate / 100));
        return total + (itemTotal - basePrice);
      }, 0);

      setPricing({
        subtotal: pricingData.subtotal,
        autoOffer: pricingData.bestOffer,
        autoOfferDiscount: pricingData.offerDiscount,
        appliedCoupon,
        couponDiscount: pricingData.couponDiscount,
        totalDiscount: pricingData.totalDiscount,
        gstAmount,
        finalTotal: pricingData.finalTotal + gstAmount,
        availableCoupons: pricingData.availableCoupons,
        canCombineDiscounts: pricingData.canCombine,
      });

      // Show auto-offer notification if new offer is applied
      if (pricingData.bestOffer && pricingData.offerDiscount > 0) {
        toast({
          title: "🎉 Offer Applied!",
          description: `${pricingData.bestOffer.title}: ₹${pricingData.offerDiscount.toFixed(2)} off`,
          duration: 3000,
        });
      }
    } catch (error) {
      logger.error('Error calculating pricing', { error });
    }
  }, [cartItems, customerCategory, toast, user, isGuestSessionExpired, pricing.appliedCoupon]);

  // Save cart and refresh pricing when cart changes
  useEffect(() => {
    if (isHydrated && !isSessionExpired) {
      saveCartToStorage();
      
      if (cartItems.length > 0) {
        refreshPricing();
      } else {
        // Clear applied coupon when cart is empty
        if (pricing.appliedCoupon) {
          const couponKey = getStorageKey('appliedCoupon');
          localStorage.removeItem(couponKey);
          refreshPricing(null); // Pass null as the coupon to clear it
        }
      }
    }
  }, [cartItems, isHydrated, isSessionExpired, saveCartToStorage, refreshPricing, getStorageKey, pricing.appliedCoupon]);

  // Set up abandoned cart tracking (only for logged-in users)
  useEffect(() => {
    if (!isHydrated || !user || isSessionExpired) return; // Only for logged-in users

    const checkAbandonedCart = () => {
      const timestampKey = getStorageKey('cartLastUpdated');
      const abandonedEmailKey = getStorageKey('abandonedEmailSent');
      
      const lastUpdated = localStorage.getItem(timestampKey);
      const abandonedEmailSent = localStorage.getItem(abandonedEmailKey);
      
      if (cartItems.length > 0 && lastUpdated && !abandonedEmailSent) {
        const lastUpdateTime = new Date(lastUpdated);
        const now = new Date();
        const minutesSinceUpdate = (now.getTime() - lastUpdateTime.getTime()) / (1000 * 60);
        
        // Send abandoned cart email after 15 minutes
        if (minutesSinceUpdate >= 15) {
          // Trigger abandoned cart email
          fetch('/api/email/abandoned-cart', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: user.email,
              userName: user.name,
              cartItems: cartItems.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                image: item.image,
              })),
              restoreCartUrl: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/cart`,
              minutesSinceAbandoned: Math.floor(minutesSinceUpdate)
            }),
          }).then(() => {
            localStorage.setItem(abandonedEmailKey, 'true');
          }).catch((error) => {
            logger.error('Failed to send abandoned cart email', { error });
          });
        }
      }
    };

  // Check every 5 minutes
  const interval = setInterval(checkAbandonedCart, 5 * 60 * 1000);
    
    // Also check immediately
    checkAbandonedCart();

    return () => clearInterval(interval);
  }, [cartItems, isHydrated, user, isSessionExpired, getStorageKey]);

  const addToCart = useCallback((item: Product, quantity = 1) => {
    // Check session expiry for guest users
    if (!user && isGuestSessionExpired()) {
      setIsSessionExpired(true);
      toast({
        title: "Session Expired",
        description: "Your guest session has expired. Please reset to continue shopping.",
        variant: "destructive",
      });
      return;
    }

    setCartItems((prevItems) => {
      const existingItem = prevItems.find((cartItem) => cartItem.id === item.id);
      if (existingItem) {
        return prevItems.map((cartItem) =>
          cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + quantity } : cartItem
        );
      }
      return [...prevItems, { ...item, quantity }];
    });
    
    toast({
      title: "Added to cart",
      description: `${item.name} has been added to your cart.`,
    });
  }, [toast, user, isGuestSessionExpired]);

  const removeFromCart = useCallback((itemId: string) => {
    // Check session expiry for guest users
    if (!user && isGuestSessionExpired()) {
      setIsSessionExpired(true);
      return;
    }

    setCartItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
    toast({
      title: "Item removed",
      description: "The item has been removed from your cart.",
    });
  }, [toast, user, isGuestSessionExpired]);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    // Check session expiry for guest users
    if (!user && isGuestSessionExpired()) {
      setIsSessionExpired(true);
      return;
    }

    if (quantity <= 0) {
      removeFromCart(itemId);
    } else {
      setCartItems((prevItems) =>
        prevItems.map((item) => (item.id === itemId ? { ...item, quantity } : item))
      );
    }
  }, [removeFromCart, user, isGuestSessionExpired]);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setPricing(prev => ({ ...prev, appliedCoupon: null }));
    
    // Reset all session tracking
    const cartKey = getStorageKey('cart');
    const couponKey = getStorageKey('appliedCoupon');
    const timestampKey = getStorageKey('cartLastUpdated');
    const abandonedEmailKey = getStorageKey('abandonedEmailSent');
    
    localStorage.removeItem(cartKey);
    localStorage.removeItem(couponKey);
    localStorage.removeItem(timestampKey);
    localStorage.removeItem(abandonedEmailKey);
    
    toast({
      title: "Cart cleared",
      description: "All items have been removed from your cart.",
    });
  }, [getStorageKey, toast]);

  const applyCoupon = useCallback(async (coupon: Coupon): Promise<boolean> => {
    // Check session expiry for guest users
    if (!user && isGuestSessionExpired()) {
      setIsSessionExpired(true);
      toast({
        title: "Session Expired",
        description: "Your guest session has expired. Please reset to continue.",
        variant: "destructive",
      });
      return false;
    }

    try {
      // Validate coupon against cart
      const validation = await offerDiscountService.isCouponApplicable(coupon, cartItems, pricing.subtotal);
      
      if (!validation) {
        toast({
          title: "Coupon Invalid",
          description: "This coupon cannot be applied to your cart.",
          variant: "destructive",
        });
        return false;
      }
      
      const couponKey = getStorageKey('appliedCoupon');
      localStorage.setItem(couponKey, JSON.stringify(coupon));
      
      toast({
        title: "Coupon Applied!",
        description: `${coupon.code} has been applied to your cart.`,
      });
      
      // Refresh pricing with the new coupon
      await refreshPricing(coupon);
      
      return true;
    } catch (error) {
      logger.error('Error applying coupon', { error, couponCode: coupon.code });
      toast({
        title: "Error",
        description: "Failed to apply coupon. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [cartItems, pricing.subtotal, toast, refreshPricing, getStorageKey, user, isGuestSessionExpired]);

  const removeCoupon = useCallback(() => {
    // Check session expiry for guest users
    if (!user && isGuestSessionExpired()) {
      setIsSessionExpired(true);
      return;
    }
    
    const couponKey = getStorageKey('appliedCoupon');
    localStorage.removeItem(couponKey);
    
    toast({
      title: "Coupon Removed",
      description: "The coupon has been removed from your cart.",
    });
    
    // Refresh pricing without the coupon
    refreshPricing(null);
  }, [toast, getStorageKey, user, isGuestSessionExpired, refreshPricing]);

  // Legacy computed values for backward compatibility
  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  const cartSubtotal = cartItems.reduce((total, item) => {
    const price = item.price;
    const gstRate = item.gstRate || 0;
    const basePrice = price / (1 + (gstRate / 100));
    return total + basePrice * item.quantity;
  }, 0);

  const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  const cartGst = cartTotal - cartSubtotal;

  // Handle session expiry UI
  const handleSessionExpired = useCallback(() => {
    setIsSessionExpired(true);
    toast({
      title: "Session Expired",
      description: "Your guest session has expired after 1 hour of inactivity. Cart has been reset.",
      variant: "destructive",
      action: (
        <button
          onClick={() => {
            resetGuestSession();
            setIsSessionExpired(false);
          }}
          className="bg-white text-black px-3 py-1 rounded text-sm hover:bg-gray-100"
        >
          Continue Shopping
        </button>
      ),
    });
  }, [toast, resetGuestSession]);

  // Check for session expiry on cart access
  useEffect(() => {
    if (!user && isGuestSessionExpired() && cartItems.length > 0) {
      handleSessionExpired();
      resetGuestSession();
    }
  }, [user, isGuestSessionExpired, cartItems.length, handleSessionExpired, resetGuestSession]);

  const value = {
    cartItems,
    pricing,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    applyCoupon,
    removeCoupon,
    refreshPricing,
    cartCount,
    cartSubtotal,
    cartGst,
    cartTotal,
    isSessionExpired,
    resetGuestSession: () => {
      resetGuestSession();
      setIsSessionExpired(false);
    },
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
