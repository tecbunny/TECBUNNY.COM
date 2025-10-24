'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Trash2, Plus, Minus } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useCart } from '../../lib/hooks';
import type { CartItem } from '../../lib/types';

interface CartItemCardProps {
  item: CartItem;
}

export function CartItemCard({ item }: CartItemCardProps) {
  const { updateQuantity, removeFromCart } = useCart();
  const candidateImages: string[] = [];
  if (typeof item.image === 'string') {
    const trimmed = item.image.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          for (const img of parsed) {
            if (typeof img === 'string') {
              candidateImages.push(img);
            }
          }
        }
      } catch {
        candidateImages.push(trimmed);
      }
    } else {
      candidateImages.push(trimmed);
    }
  }
  if (Array.isArray(item.images)) {
    for (const img of item.images) {
      if (typeof img === 'string') {
        candidateImages.push(img);
      }
    }
  }

  const cleanSrc = candidateImages.find((src) => typeof src === 'string' && src.trim().length > 0);
  const imageSrc = cleanSrc ? cleanSrc.trim() : '/brand.png';
  const fallbackProductUrl = item.id?.startsWith('service-') ? '/services' : `/products/${item.id}`;
  const productHref = typeof item.product_url === 'string' && item.product_url.length > 0
    ? item.product_url
    : fallbackProductUrl;

  const handleQuantityChange = (newQuantity: number) => {
    updateQuantity(item.id, newQuantity);
  };

  return (
    <div className="flex items-start gap-4">
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border">
        <Image
          src={imageSrc}
          alt={item.name}
          fill
          sizes="80px"
          unoptimized
          className="object-cover"
        />
      </div>
      <div className="flex-1">
        <Link href={productHref} className="font-medium hover:text-primary">
          {item.name}
        </Link>
        <p className="text-sm text-muted-foreground">₹{item.price.toFixed(2)}</p>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleQuantityChange(item.quantity - 1)}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              value={item.quantity}
              onChange={(e) => handleQuantityChange(parseInt(e.target.value, 10) || 1)}
              className="h-7 w-12 text-center"
              min="1"
            />
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleQuantityChange(item.quantity + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
           <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => removeFromCart(item.id)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Remove item</span>
          </Button>
        </div>
      </div>
    </div>
  );
}