'use client';

import type { CartItem, CustomerCategory, AutoOffer, Coupon } from '../lib/types';
import { createClient } from '../lib/supabase/client';

import { logger } from './logger';

/**
 * Enhanced Offer and Discount Service
 * Handles auto-offers and manual discounts with combination rules
 */
export class OfferDiscountService {
    private supabase = createClient();
    
    /**
     * Get all active auto-offers
     */
    async getActiveOffers(): Promise<AutoOffer[]> {
        const now = new Date().toISOString();
        
        const { data, error } = await this.supabase
            .from('auto_offers')
            .select('*')
            .eq('is_active', true)
            .eq('auto_apply', true)
            .lte('conditions->valid_from', now)
            .gte('conditions->valid_to', now)
            .order('priority', { ascending: false }); // Higher priority first
            
        if (error) {
            logger.error('Error fetching offers', { error });
            return [];
        }
        
        return data || [];
    }
    
    /**
     * Get all active discount coupons
     */
    async getActiveCoupons(): Promise<Coupon[]> {
        const now = new Date().toISOString();
        
        const { data, error } = await this.supabase
            .from('coupons')
            .select('*')
            .eq('status', 'active')
            .lte('start_date', now)
            .gte('expiry_date', now);
            
        if (error) {
            logger.error('Error fetching coupons', { error });
            return [];
        }
        
        return data || [];
    }
    
    /**
     * Check if an offer is applicable to the cart
     */
    isOfferApplicable(
        offer: AutoOffer, 
        cartItems: CartItem[], 
        customerCategory?: CustomerCategory,
        cartTotal: number = 0
    ): boolean {
        const { conditions } = offer;
        
        // Check customer category
        if (conditions.customer_category && customerCategory) {
            if (!conditions.customer_category.includes(customerCategory)) {
                return false;
            }
        }
        
        // Check minimum order value
        if (conditions.minimum_order_value && cartTotal < conditions.minimum_order_value) {
            return false;
        }
        
        // Check applicable categories
        if (conditions.applicable_categories && conditions.applicable_categories.length > 0) {
            const hasApplicableCategory = cartItems.some(item => 
                conditions.applicable_categories!.includes(item.category)
            );
            if (!hasApplicableCategory) {
                return false;
            }
        }
        
        // Check applicable products
        if (conditions.applicable_product_ids && conditions.applicable_product_ids.length > 0) {
            const hasApplicableProduct = cartItems.some(item => 
                conditions.applicable_product_ids!.includes(item.id)
            );
            if (!hasApplicableProduct) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Check if a coupon is applicable to the cart
     */
    isCouponApplicable(
        coupon: Coupon, 
        cartItems: CartItem[], 
        cartTotal: number = 0
    ): boolean {
        // Check minimum purchase
        if (coupon.min_purchase && cartTotal < coupon.min_purchase) {
            return false;
        }
        
        // Check applicable category
        if (coupon.applicable_category) {
            const hasApplicableCategory = cartItems.some(item => 
                item.category === coupon.applicable_category
            );
            if (!hasApplicableCategory) {
                return false;
            }
        }
        
        // Check applicable product
        if (coupon.applicable_product_id) {
            const hasApplicableProduct = cartItems.some(item => 
                item.id === coupon.applicable_product_id
            );
            if (!hasApplicableProduct) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Calculate offer discount amount
     */
    calculateOfferDiscount(
        offer: AutoOffer, 
        cartItems: CartItem[], 
        cartTotal: number
    ): number {
        let applicableAmount = 0;
        
        // Calculate applicable amount based on offer type
        if (offer.conditions.applicable_categories && offer.conditions.applicable_categories.length > 0) {
            // Category-specific offer
            applicableAmount = cartItems
                .filter(item => offer.conditions.applicable_categories!.includes(item.category))
                .reduce((sum, item) => sum + (item.price * item.quantity), 0);
        } else if (offer.conditions.applicable_product_ids && offer.conditions.applicable_product_ids.length > 0) {
            // Product-specific offer
            applicableAmount = cartItems
                .filter(item => offer.conditions.applicable_product_ids!.includes(item.id))
                .reduce((sum, item) => sum + (item.price * item.quantity), 0);
        } else {
            // General offer applies to entire cart
            applicableAmount = cartTotal;
        }
        
        let discount = 0;
        
        if (offer.discount_percentage) {
            discount = (applicableAmount * offer.discount_percentage) / 100;
        } else if (offer.discount_amount) {
            discount = Math.min(offer.discount_amount, applicableAmount);
        }
        
        // Apply maximum discount limit if specified
        if (offer.max_discount_amount) {
            discount = Math.min(discount, offer.max_discount_amount);
        }
        
        return Math.round(discount * 100) / 100; // Round to 2 decimal places
    }
    
    /**
     * Calculate coupon discount amount
     */
    calculateCouponDiscount(
        coupon: Coupon, 
        cartItems: CartItem[], 
        cartTotal: number
    ): number {
        let applicableAmount = 0;
        
        // Calculate applicable amount
        if (coupon.applicable_category) {
            applicableAmount = cartItems
                .filter(item => item.category === coupon.applicable_category)
                .reduce((sum, item) => sum + (item.price * item.quantity), 0);
        } else if (coupon.applicable_product_id) {
            applicableAmount = cartItems
                .filter(item => item.id === coupon.applicable_product_id)
                .reduce((sum, item) => sum + (item.price * item.quantity), 0);
        } else {
            applicableAmount = cartTotal;
        }
        
        let discount = 0;
        
        if (coupon.type === 'percentage') {
            discount = (applicableAmount * coupon.value) / 100;
        } else if (coupon.type === 'fixed') {
            discount = Math.min(coupon.value, applicableAmount);
        }
        
        return Math.round(discount * 100) / 100;
    }
    
    /**
     * Find the best applicable offer for the cart
     */
    async getBestOffer(
        cartItems: CartItem[], 
        customerCategory?: CustomerCategory, 
        cartTotal: number = 0
    ): Promise<AutoOffer | null> {
        const offers = await this.getActiveOffers();
        const applicableOffers = offers.filter(offer => 
            this.isOfferApplicable(offer, cartItems, customerCategory, cartTotal)
        );
        
        if (applicableOffers.length === 0) {
            return null;
        }
        
        // Find offer with highest discount amount
        let bestOffer = applicableOffers[0];
        let bestDiscount = this.calculateOfferDiscount(bestOffer, cartItems, cartTotal);
        
        for (const offer of applicableOffers.slice(1)) {
            const discount = this.calculateOfferDiscount(offer, cartItems, cartTotal);
            if (discount > bestDiscount) {
                bestOffer = offer;
                bestDiscount = discount;
            }
        }
        
        return bestOffer;
    }
    
    /**
     * Get applicable coupons for the cart
     */
    async getApplicableCoupons(
        cartItems: CartItem[], 
        cartTotal: number = 0
    ): Promise<Coupon[]> {
        const coupons = await this.getActiveCoupons();
        return coupons.filter(coupon => 
            this.isCouponApplicable(coupon, cartItems, cartTotal)
        );
    }
    
    /**
     * Calculate cart pricing with offers and discounts
     */
    async calculateCartPricing(
        cartItems: CartItem[],
        customerCategory?: CustomerCategory,
        selectedCoupon?: Coupon
    ): Promise<{
        subtotal: number;
        bestOffer: AutoOffer | null;
        offerDiscount: number;
        couponDiscount: number;
        totalDiscount: number;
        finalTotal: number;
        availableCoupons: Coupon[];
        canCombine: boolean;
    }> {
        const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Get best auto-offer
        const bestOffer = await this.getBestOffer(cartItems, customerCategory, subtotal);
        const offerDiscount = bestOffer ? this.calculateOfferDiscount(bestOffer, cartItems, subtotal) : 0;
        
        // Calculate coupon discount if selected
        let couponDiscount = 0;
        if (selectedCoupon && this.isCouponApplicable(selectedCoupon, cartItems, subtotal)) {
            couponDiscount = this.calculateCouponDiscount(selectedCoupon, cartItems, subtotal);
        }
        
        // Get available coupons
        const availableCoupons = await this.getApplicableCoupons(cartItems, subtotal);
        
        // Determine if offer and coupon can be combined
        // Rule: Can combine if they apply to different aspects (e.g., offer on category, coupon on specific product)
        const canCombine = this.canCombineOfferAndCoupon(bestOffer, selectedCoupon, cartItems);
        
        // Calculate total discount (don't stack same type, but allow combination)
        let totalDiscount = 0;
        if (canCombine && bestOffer && selectedCoupon) {
            totalDiscount = offerDiscount + couponDiscount;
        } else {
            // Take the better of the two
            totalDiscount = Math.max(offerDiscount, couponDiscount);
        }
        
        const finalTotal = Math.max(0, subtotal - totalDiscount);
        
        return {
            subtotal,
            bestOffer,
            offerDiscount: canCombine ? offerDiscount : (offerDiscount >= couponDiscount ? offerDiscount : 0),
            couponDiscount: canCombine ? couponDiscount : (couponDiscount > offerDiscount ? couponDiscount : 0),
            totalDiscount,
            finalTotal,
            availableCoupons,
            canCombine
        };
    }
    
    /**
     * Check if offer and coupon can be combined
     */
    private canCombineOfferAndCoupon(
        offer: AutoOffer | null, 
        coupon: Coupon | undefined, 
        _cartItems: CartItem[]
    ): boolean {
        if (!offer || !coupon) return false;
        
        // Don't combine if both are general (apply to entire cart)
        const offerIsGeneral = !offer.conditions.applicable_categories?.length && 
                              !offer.conditions.applicable_product_ids?.length;
        const couponIsGeneral = !coupon.applicable_category && !coupon.applicable_product_id;
        
        if (offerIsGeneral && couponIsGeneral) {
            return false;
        }
        
        // Don't combine if they target the same products/categories
        if (offer.conditions.applicable_categories?.includes(coupon.applicable_category!)) {
            return false;
        }
        
        if (offer.conditions.applicable_product_ids?.includes(coupon.applicable_product_id!)) {
            return false;
        }
        
        return true;
    }
}

// Export singleton instance
export const offerDiscountService = new OfferDiscountService();