
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { Eye, Tag, Truck } from 'lucide-react';

import type { Product } from '../../lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { AddToCartButton } from '../../components/cart/AddToCartButton';


import { StarRating } from './StarRating';

interface ProductCardProps {
  product: Product;
  viewMode?: 'grid' | 'list';
}

export function ProductCard({ product, viewMode = 'grid' }: ProductCardProps) {
  const router = useRouter();
  // Normalize primary image: prefer product.image, else first of images (string or {url})
  const displayImage = React.useMemo(() => {
    if (product?.image) return product.image;
    const firstFromImages = Array.isArray((product as any)?.images) && (product as any).images.length > 0
      ? (typeof (product as any).images[0] === 'string' ? (product as any).images[0] : (product as any).images[0]?.url || '')
      : '';
    return firstFromImages || '';
  }, [product]);
  // Calculate pricing with automatic discounts
  const pricing = React.useMemo(() => {
    // Use product price as sale price
    const salePrice = product.price;
    // Calculate MRP (assuming MRP is 30% higher than sale price if not provided)
    const mrp = product.mrp || Math.round(salePrice * 1.3);
    
    // Calculate percentage off from MRP to Sale Price
    const percentageOff = mrp > salePrice ? Math.round(((mrp - salePrice) / mrp) * 100) : 0;
    
    // Calculate savings amount from MRP to Sale Price
    const savingsAmount = mrp > salePrice ? mrp - salePrice : 0;
    
    // Apply system discounts for offer price
    // Dynamic system discount: only apply if product has an explicit discount flag/fields
    const categoryDiscounts: Record<string, number> = { };// previously hardcoded values removed
    let systemDiscountPercentage = 0;
    // Use product.discount_percentage if present
    if (typeof (product as any).discount_percentage === 'number') {
      systemDiscountPercentage = Math.max(0, Math.min(90, (product as any).discount_percentage));
    } else if ((product as any).has_active_discount) {
      // fallback minimal discount if explicitly flagged
      systemDiscountPercentage = 5;
    } else if (categoryDiscounts[product.category]) {
      systemDiscountPercentage = categoryDiscounts[product.category] || 0;
    }
    const offerPrice = Math.round(salePrice * (1 - systemDiscountPercentage / 100));
    
    // Calculate extra discount amount (from sale price to offer price)
    const extraDiscount = salePrice - offerPrice;
    
    return {
      mrp,
      salePrice,
      offerPrice,
      originalPrice: salePrice, // For compatibility
      percentageOff,
      savingsAmount,
      systemDiscountPercentage,
      extraDiscount,
      discountPercentage: systemDiscountPercentage, // For compatibility
      totalDiscount: salePrice - offerPrice,
  appliedDiscounts: systemDiscountPercentage > 0 ? [ (product as any).discount_source || 'Automatic Discount' ] : []
    };
  }, [product]);

  // Get stock status display with better messaging
  const stockInfo = React.useMemo(() => {
    const status = product.stock_status || 'in_stock';
    const quantity = product.stock_quantity || Math.floor(Math.random() * 100) + 20;
    
    switch (status) {
      case 'out_of_stock':
        return {
          text: 'Out of Stock',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          quantity: 'Currently unavailable',
          stockText: 'Sold Out'
        };
      case 'low_stock':
        return {
          text: 'Low Stock',
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          quantity: `Only ${Math.min(quantity, 5)} left`,
          stockText: `Last ${Math.min(quantity, 5)} pieces!`
        };
      default:
        return {
          text: 'In Stock',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          quantity: `${quantity} available`,
          stockText: quantity > 50 ? 'In Stock' : `${quantity} left`
        };
    }
  }, [product.stock_status, product.stock_quantity]);
  if (viewMode === 'list') {
    return (
      <Card onClick={() => router.push(`/products/${product.id}`)} className="cursor-pointer flex flex-col md:flex-row overflow-hidden transition-all duration-300 hover:shadow-lg">
        <div className="w-full md:w-48 lg:w-64 relative">
          <div className="block">
            <div className="aspect-square md:aspect-[4/3] w-full relative bg-gray-100">
              <img
                src={displayImage || 'https://placehold.co/300x300/e2e8f0/64748b.png?text=Product+Image'}
                alt={product.name}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://placehold.co/300x300/e2e8f0/64748b.png?text=Product+Image';
                }}
              />
            </div>
          </div>
        </div>
        <div className="flex-1 p-6">
          <div className="flex flex-col h-full">
            <div className="flex-1">
              {/* Brand and Category with Logo */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {product.brand_logo && (
                    <img 
                      src={product.brand_logo} 
                      alt={`${product.brand} logo`}
                      className="w-6 h-6 object-contain"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  )}
                  <span className="text-sm font-semibold text-primary">
                    {product.brand || 'Unknown Brand'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {product.model_number && (
                    <span className="text-xs text-muted-foreground px-2 py-1 bg-secondary rounded">
                      {product.model_number}
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {product.category}
                  </span>
                </div>
              </div>
              
              {/* Product Name */}
              <CardTitle className="text-2xl mb-3 leading-tight font-bold text-foreground">
                <span className="hover:text-primary transition-colors">{product.name}</span>
              </CardTitle>
              
              {/* Description */}
              <p className="text-muted-foreground mb-6 line-clamp-3 text-base">
                {product.description}
              </p>
              
              {/* Rating */}
              <div className="flex items-center gap-2 mb-6">
                <StarRating rating={product.rating} />
                <span className="text-base text-muted-foreground font-medium">
                  {product.rating} ({product.reviewCount} reviews)
                </span>
              </div>
              
              {/* Pricing */}
              <div className="flex flex-col gap-3 mb-4">{/* Changed gap from 2 to 3 and added more spacing */}
                {/* MRP and Percentage Off */}
                {pricing.percentageOff > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-base text-muted-foreground">
                      MRP: <span className="line-through">₹{pricing.mrp.toLocaleString()}</span>
                    </span>
                    <span className="text-base font-bold text-red-600">
                      {pricing.percentageOff}% OFF
                    </span>
                  </div>
                )}
                
                {/* Sale Price with Up to Rs. *** off */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold text-primary">
                      Sale Price: ₹{pricing.salePrice.toLocaleString()}
                    </span>
                    {pricing.savingsAmount > 0 && (
                      <span className="text-base text-green-600 font-medium">
                        Up to ₹{pricing.savingsAmount.toLocaleString()} off
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Offer Price and Extra Discount */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xl font-bold text-green-700">
                      Offer Price: ₹{pricing.offerPrice.toLocaleString()}
                    </span>
                    <span className="text-base font-bold text-orange-600">
                      {pricing.systemDiscountPercentage}% OFF
                    </span>
                  </div>
                  {pricing.extraDiscount > 0 && (
                    <span className="text-base text-green-600 font-medium">
                      Extra Discount: ₹{pricing.extraDiscount.toLocaleString()}
                    </span>
                  )}
                </div>
                
                {pricing.appliedDiscounts.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-green-600" />
                    <span className="text-base text-green-600 font-medium">
                      {pricing.appliedDiscounts[0]}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Stock and Actions */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex flex-col gap-2">
                {/* Stock Status */}
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${stockInfo.color}`}>
                    {stockInfo.text}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {stockInfo.stockText}
                  </span>
                </div>
                
                {/* Additional Info */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Truck className="h-3 w-3" />
                  <span>Free delivery</span>
                </div>
              </div>
              
              {/* Add to Cart */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
                <AddToCartButton product={product} />
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Grid view (default)
  return (
    <Card onClick={() => router.push(`/products/${product.id}`)} className="cursor-pointer flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group">
      <CardHeader className="p-0 relative">
        <div className="block">
          <div className="aspect-square w-full relative overflow-hidden bg-gray-100">
            <img
              src={displayImage || 'https://placehold.co/400x400/e2e8f0/64748b.png?text=Product+Image'}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://placehold.co/400x400/e2e8f0/64748b.png?text=Product+Image';
              }}
            />
          </div>
  </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-4 flex flex-col">
        <div className="flex-1 flex flex-col">
          {/* Brand and Category with Logo */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              {product.brand_logo && (
                <img 
                  src={product.brand_logo} 
                  alt={`${product.brand} logo`}
                  className="w-5 h-5 object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              )}
              <span className="text-sm font-semibold text-primary truncate">
                {product.brand || 'Unknown Brand'}
              </span>
            </div>
            <div className="flex flex-col items-end gap-1">
              {product.model_number && (
                <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-secondary rounded text-right truncate max-w-[80px]">
                  {product.model_number}
                </span>
              )}
              <span className="text-xs text-muted-foreground truncate">
                {product.category}
              </span>
            </div>
          </div>
          
          {/* Product Name */}
          <CardTitle className="text-lg font-bold leading-tight line-clamp-2 mb-3 text-foreground">
            <span className="hover:text-primary transition-colors">{product.name}</span>
          </CardTitle>
          
          {/* Rating */}
          <div className="flex items-center gap-2 mb-3">
            <StarRating rating={product.rating} />
            <span className="text-sm text-muted-foreground font-medium">
              {product.rating} ({product.reviewCount} reviews)
            </span>
          </div>
          
          {/* Description (shortened for grid view) - Always reserve space */}
          <div className="mb-4 min-h-[2.5rem] flex items-start">
            {product.description ? (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {product.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground opacity-50">
                No description available
              </p>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex flex-col gap-3">
        {/* Pricing Section */}
        <div className="w-full space-y-2">
          {/* MRP and Percentage Off */}
          {pricing.percentageOff > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                MRP: <span className="line-through">₹{pricing.mrp.toLocaleString()}</span>
              </span>
              <span className="text-sm font-bold text-red-600">
                {pricing.percentageOff}% OFF
              </span>
            </div>
          )}
          
          {/* Sale Price with Up to Rs. *** off */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xl font-bold text-primary">
                Sale Price: ₹{pricing.salePrice.toLocaleString()}
              </span>
              {pricing.savingsAmount > 0 && (
                <span className="text-sm text-green-600 font-medium">
                  Up to ₹{pricing.savingsAmount.toLocaleString()} off
                </span>
              )}
            </div>
          </div>
          
          {/* Offer Price and Extra Discount */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg font-bold text-green-700">
                Offer Price: ₹{pricing.offerPrice.toLocaleString()}
              </span>
              <span className="text-sm font-bold text-orange-600">
                {pricing.systemDiscountPercentage}% OFF
              </span>
            </div>
            {pricing.extraDiscount > 0 && (
              <span className="text-sm text-green-600 font-medium">
                Extra Discount: ₹{pricing.extraDiscount.toLocaleString()}
              </span>
            )}
          </div>
          
          {/* Applied System Discount */}
          {pricing.appliedDiscounts.length > 0 && (
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600 font-medium">
                {pricing.appliedDiscounts[0]}
              </span>
            </div>
          )}
        </div>
        
        {/* Stock Info and Actions */}
        <div className="flex items-center justify-between w-full pt-2 border-t">
          <div className="flex flex-col gap-1">
            <span className={`text-xs ${stockInfo.color} font-medium`}>
              {stockInfo.text}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Truck className="h-3 w-3" />
              Free delivery
            </span>
          </div>
          <AddToCartButton product={product} size="sm" />
        </div>
      </CardFooter>
    </Card>
  );
}