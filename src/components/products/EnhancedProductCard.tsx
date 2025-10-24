'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { Eye } from 'lucide-react';

import type { Product } from '../../lib/types';
import { Card, Button, Badge } from '../../components/ui/enhanced-ui';
import { AddToCartButton } from '../../components/cart/AddToCartButton';
import { WishlistButton } from '../../components/wishlist/WishlistButton';

import { StarRating } from './StarRating';

interface EnhancedProductCardProps {
  product: Product;
}

export function EnhancedProductCard({ product }: EnhancedProductCardProps) {
  const displayImage = React.useMemo(() => {
    if (product?.image) return product.image;
    const firstFromImages = Array.isArray((product as any)?.images) && (product as any).images.length > 0
      ? (typeof (product as any).images[0] === 'string' ? (product as any).images[0] : (product as any).images[0]?.url || '')
      : '';
    return firstFromImages || '';
  }, [product]);

  const isOutOfStock = product.stock_status === 'out_of_stock';

  return (
    <Card 
      className="group relative overflow-hidden transition-all duration-500 hover:scale-105 shadow-harsh hover:shadow-xl backdrop-blur-sm bg-gradient-to-br from-white/90 to-blue-50/60 border border-blue-200/50"
    >
      {/* Image Section */}
      <div className="relative aspect-square overflow-hidden rounded-t-xl">
        <Link href={`/products/${product.id}`} className="block">
          <Image
            src={(displayImage && displayImage.startsWith('http')) ? displayImage : "https://placehold.co/600x400.png"}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            data-ai-hint={`${product.category} product`}
          />
          
          {/* Overlay with gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Category Badge */}
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="backdrop-blur-sm bg-white/95">
              {product.category}
            </Badge>
          </div>
          
          {/* Quick Actions */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
            <WishlistButton product={product} />
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0 backdrop-blur-sm bg-white/95 hover:bg-blue-100"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Price overlay on hover */}
          <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
            <div className="backdrop-blur-sm bg-white/95 rounded-lg p-2">
              <p className="text-lg font-bold text-blue-600">₹{product.price.toFixed(2)}</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Content Section */}
      <div className="p-6 flex flex-col h-full">
        <div className="flex-1 space-y-3">
          {/* Product Name */}
          <h3 className="font-semibold text-lg leading-tight text-gray-900 group-hover:text-blue-600 transition-colors">
            <Link href={`/products/${product.id}`} className="hover:underline">
              {product.name}
            </Link>
          </h3>
          
          {/* Rating */}
          <div className="flex items-center gap-2">
            <StarRating rating={product.rating} />
            <span className="text-sm text-gray-500">
              ({product.reviewCount})
            </span>
          </div>
          
          {/* Price (visible when not hovering image) */}
          <div className="group-hover:opacity-0 transition-opacity duration-300">
            <p className="text-2xl font-bold text-blue-600">
              ₹{product.price.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 mt-auto">
          {isOutOfStock ? (
            <Button 
              disabled 
              className="w-full opacity-50 bg-gray-400 text-white cursor-not-allowed"
            >
              Out of Stock
            </Button>
          ) : (
            <div className="w-full bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg overflow-hidden">
              <AddToCartButton product={product} />
            </div>
          )}
        </div>
      </div>

      {/* Hover Animation Border */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400/20 to-blue-400/20 blur-sm" />
      </div>
    </Card>
  );
}