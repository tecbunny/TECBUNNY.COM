'use client';

import * as React from 'react';
import { ShoppingCart } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { useCart } from '../../lib/hooks';
import type { Product } from '../../lib/types';

interface AddToCartButtonProps {
  product: Product;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
}

export function AddToCartButton({ product, className, size = "sm" }: AddToCartButtonProps) {
  const { addToCart } = useCart();
  const [busy, setBusy] = React.useState(false);

  return (
    <Button 
      size={size}
      className={className}
      disabled={busy}
      onClick={(e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        try {
          addToCart(product);
        } finally {
          // Release quickly; add a tiny delay to avoid double-fire
          setTimeout(() => setBusy(false), 300);
        }
      }}
      aria-label={`Add ${product.name} to cart`}
    >
      <ShoppingCart className="mr-2 h-4 w-4" />
      Add to Cart
    </Button>
  );
}