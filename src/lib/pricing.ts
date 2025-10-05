import type { Product } from './types';

// Discount types that can be applied
export interface Discount {
  id: string;
  name: string;
  type: 'percentage' | 'fixed' | 'buy_one_get_one' | 'bulk';
  value: number;
  minQuantity?: number;
  maxDiscount?: number;
  startDate?: string;
  endDate?: string;
  applicableCategories?: string[];
  applicableBrands?: string[];
}

// Customer category based discounts
export const CUSTOMER_DISCOUNTS = {
  Normal: 0,
  Standard: 5,
  Premium: 10,
} as const;

// Category based discounts
export const CATEGORY_DISCOUNTS = {
  Audio: 15,
  Accessories: 20,
  Laptops: 10,
  Monitors: 12,
  Cameras: 8,
  Tablets: 18,
  Wearables: 25,
  Furniture: 30,
} as const;

// Brand based discounts
export const BRAND_DISCOUNTS = {
  CyberAcoustics: 10,
  PowerTech: 15,
  AuraTech: 8,
  VisionTech: 12,
  GameTech: 20,
  DisplayPro: 10,
  ErgoTech: 25,
  AudioPro: 15,
} as const;

// Seasonal/Festival discounts
export const SEASONAL_DISCOUNTS = {
  DIWALI: { percentage: 20, startDate: '2025-10-01', endDate: '2025-11-15' },
  NEW_YEAR: { percentage: 15, startDate: '2025-12-25', endDate: '2026-01-05' },
  SUMMER_SALE: { percentage: 25, startDate: '2025-04-01', endDate: '2025-06-30' },
  MONSOON_SPECIAL: { percentage: 18, startDate: '2025-07-01', endDate: '2025-09-30' },
} as const;

/**
 * Calculate the best offer price for a product
 */
export function calculateOfferPrice(
  product: Product,
  customerCategory: 'Normal' | 'Standard' | 'Premium' = 'Normal',
  quantity: number = 1,
  customDiscounts: Discount[] = []
): {
  offerPrice: number;
  originalPrice: number;
  mrp: number;
  totalDiscount: number;
  discountPercentage: number;
  appliedDiscounts: string[];
} {
  const originalPrice = product.price;
  const mrp = product.mrp || product.price;
  let appliedDiscounts: string[] = [];

  // Start with the base selling price
  let currentPrice = originalPrice;

  // Apply customer category discount
  const customerDiscount = CUSTOMER_DISCOUNTS[customerCategory];
  if (customerDiscount > 0) {
    currentPrice = currentPrice * (1 - customerDiscount / 100);
    appliedDiscounts.push(`${customerCategory} Customer (${customerDiscount}%)`);
  }

  // Apply category discount
  const categoryDiscount = CATEGORY_DISCOUNTS[product.category as keyof typeof CATEGORY_DISCOUNTS];
  if (categoryDiscount) {
    const categoryDiscountedPrice = originalPrice * (1 - categoryDiscount / 100);
    if (categoryDiscountedPrice < currentPrice) {
      currentPrice = categoryDiscountedPrice;
      appliedDiscounts = [`Category Discount (${categoryDiscount}%)`];
    }
  }

  // Apply brand discount
  const brandDiscount = BRAND_DISCOUNTS[product.brand as keyof typeof BRAND_DISCOUNTS];
  if (brandDiscount) {
    const brandDiscountedPrice = originalPrice * (1 - brandDiscount / 100);
    if (brandDiscountedPrice < currentPrice) {
      currentPrice = brandDiscountedPrice;
      appliedDiscounts = [`Brand Discount (${brandDiscount}%)`];
    }
  }

  // Apply seasonal discounts (check if current date falls within any seasonal discount period)
  const currentDate = new Date();
  for (const [seasonName, seasonDiscount] of Object.entries(SEASONAL_DISCOUNTS)) {
    const startDate = new Date(seasonDiscount.startDate);
    const endDate = new Date(seasonDiscount.endDate);
    
    if (currentDate >= startDate && currentDate <= endDate) {
      const seasonalDiscountedPrice = originalPrice * (1 - seasonDiscount.percentage / 100);
      if (seasonalDiscountedPrice < currentPrice) {
        currentPrice = seasonalDiscountedPrice;
        appliedDiscounts = [`${seasonName} Sale (${seasonDiscount.percentage}%)`];
      }
    }
  }

  // Apply bulk quantity discounts
  if (quantity >= 10) {
    const bulkDiscount = quantity >= 50 ? 15 : quantity >= 20 ? 10 : 5;
    const bulkDiscountedPrice = currentPrice * (1 - bulkDiscount / 100);
    currentPrice = bulkDiscountedPrice;
    appliedDiscounts.push(`Bulk Order (${bulkDiscount}%)`);
  }

  // Apply custom discounts
  for (const discount of customDiscounts) {
    if (isDiscountApplicable(discount, product, quantity, currentDate)) {
      let discountedPrice = currentPrice;
      
      switch (discount.type) {
        case 'percentage':
          discountedPrice = currentPrice * (1 - discount.value / 100);
          if (discount.maxDiscount) {
            const maxDiscountAmount = originalPrice * (discount.maxDiscount / 100);
            const discountAmount = currentPrice - discountedPrice;
            if (discountAmount > maxDiscountAmount) {
              discountedPrice = currentPrice - maxDiscountAmount;
            }
          }
          break;
        case 'fixed':
          discountedPrice = Math.max(0, currentPrice - discount.value);
          break;
        case 'buy_one_get_one':
          if (quantity >= 2) {
            discountedPrice = currentPrice * 0.5; // 50% off when buying 2 or more
          }
          break;
      }
      
      if (discountedPrice < currentPrice) {
        currentPrice = discountedPrice;
        appliedDiscounts.push(discount.name);
      }
    }
  }

  // Ensure we don't go below a minimum margin (e.g., 10% of original price)
  const minimumPrice = originalPrice * 0.1;
  currentPrice = Math.max(currentPrice, minimumPrice);

  // Round to nearest rupee
  const offerPrice = Math.round(currentPrice);
  const totalDiscount = originalPrice - offerPrice;
  const discountPercentage = Math.round((totalDiscount / originalPrice) * 100);

  return {
    offerPrice,
    originalPrice,
    mrp,
    totalDiscount,
    discountPercentage,
    appliedDiscounts
  };
}

/**
 * Check if a discount is applicable to a product
 */
function isDiscountApplicable(
  discount: Discount,
  product: Product,
  quantity: number,
  currentDate: Date
): boolean {
  // Check date range
  if (discount.startDate && new Date(discount.startDate) > currentDate) {
    return false;
  }
  if (discount.endDate && new Date(discount.endDate) < currentDate) {
    return false;
  }

  // Check minimum quantity
  if (discount.minQuantity && quantity < discount.minQuantity) {
    return false;
  }

  // Check applicable categories
  if (discount.applicableCategories && 
      !discount.applicableCategories.includes(product.category)) {
    return false;
  }

  // Check applicable brands
  if (discount.applicableBrands && product.brand &&
      !discount.applicableBrands.includes(product.brand)) {
    return false;
  }

  return true;
}

/**
 * Get stock status based on quantity
 */
export function getStockStatus(quantity: number): 'in_stock' | 'low_stock' | 'out_of_stock' {
  if (quantity <= 0) return 'out_of_stock';
  if (quantity <= 5) return 'low_stock';
  return 'in_stock';
}

/**
 * Get stock status display text and color
 */
export function getStockStatusDisplay(status: string, quantity?: number) {
  switch (status) {
    case 'in_stock':
      return {
        text: 'In Stock',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        quantity: quantity ? `${quantity} available` : 'Available'
      };
    case 'low_stock':
      return {
        text: 'Low Stock',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        quantity: quantity ? `Only ${quantity} left` : 'Limited quantity'
      };
    case 'out_of_stock':
      return {
        text: 'Out of Stock',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        quantity: 'Currently unavailable'
      };
    default:
      return {
        text: 'Unknown',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        quantity: 'Status unknown'
      };
  }
}

/**
 * Calculate pricing for multiple products (cart/bulk pricing)
 */
export function calculateBulkPricing(
  items: Array<{ product: Product; quantity: number }>,
  customerCategory: 'Normal' | 'Standard' | 'Premium' = 'Normal'
) {
  let totalMrp = 0;
  let totalOriginalPrice = 0;
  let totalOfferPrice = 0;
  let totalSavings = 0;

  const itemPricing = items.map(({ product, quantity }) => {
    const pricing = calculateOfferPrice(product, customerCategory, quantity);
    const itemTotal = pricing.offerPrice * quantity;
    const itemMrpTotal = pricing.mrp * quantity;
    const itemOriginalTotal = pricing.originalPrice * quantity;

    totalMrp += itemMrpTotal;
    totalOriginalPrice += itemOriginalTotal;
    totalOfferPrice += itemTotal;

    return {
      product,
      quantity,
      ...pricing,
      itemTotal,
      itemMrpTotal,
      itemOriginalTotal
    };
  });

  totalSavings = totalOriginalPrice - totalOfferPrice;
  const totalDiscountPercentage = totalOriginalPrice > 0 
    ? Math.round((totalSavings / totalOriginalPrice) * 100) 
    : 0;

  return {
    items: itemPricing,
    totals: {
      mrp: totalMrp,
      originalPrice: totalOriginalPrice,
      offerPrice: totalOfferPrice,
      savings: totalSavings,
      discountPercentage: totalDiscountPercentage
    }
  };
}
