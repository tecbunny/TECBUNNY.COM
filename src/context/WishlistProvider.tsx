'use client';

import React, { createContext, useState, useEffect, useCallback } from 'react';

import type { Product } from '../lib/types';
import { useToast } from '../hooks/use-toast';
import { logger } from '../lib/logger';

interface WishlistContextType {
  wishlistItems: Product[];
  toggleWishlist: (item: Product) => void;
  isInWishlist: (itemId: string) => boolean;
  wishlistCount: number;
}

export const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wishlistItems, setWishlistItems] = useState<Product[]>([]);
  const { toast } = useToast();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedWishlist = localStorage.getItem('wishlist');
      if (storedWishlist) {
        setWishlistItems(JSON.parse(storedWishlist));
      }
    } catch (error) {
      logger.error("Failed to parse wishlist from localStorage", { error });
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('wishlist', JSON.stringify(wishlistItems));
    }
  }, [wishlistItems, isHydrated]);

  const toggleWishlist = useCallback((item: Product) => {
    setWishlistItems((prevItems) => {
      const existingItem = prevItems.find((wishlistItem) => wishlistItem.id === item.id);
      if (existingItem) {
        toast({
          title: "Removed from wishlist",
          description: `${item.name} has been removed from your wishlist.`,
        });
        return prevItems.filter((wishlistItem) => wishlistItem.id !== item.id);
      } else {
        toast({
          title: "Added to wishlist",
          description: `${item.name} has been added to your wishlist.`,
        });
        return [...prevItems, item];
      }
    });
  }, [toast]);
  
  const isInWishlist = useCallback((itemId: string) => {
    return wishlistItems.some((item) => item.id === itemId);
  }, [wishlistItems]);

  const wishlistCount = wishlistItems.length;

  const value = {
    wishlistItems,
    toggleWishlist,
    isInWishlist,
    wishlistCount,
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};
