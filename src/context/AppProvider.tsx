'use client';

import * as React from 'react';

import { AuthProvider } from './AuthProvider';
import { CartProvider } from './CartProvider';
import { WishlistProvider } from './WishlistProvider';

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>{children}</WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}
