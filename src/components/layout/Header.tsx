
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Heart, LogOut, ShoppingCart, User, Shield, Briefcase, FileText, Menu, X, Package } from 'lucide-react';

import { logger } from '../../lib/logger';

import { Button } from '../../components/ui/button';
import { DynamicLogo } from '../../components/ui/dynamic-logo';
import { ProductSearch } from '../../components/products/ProductSearch';
import { CartSheet } from '../../components/cart/CartSheet';
import { useAuth, useCart, useWishlist } from '../../lib/hooks';
import { Badge } from '../../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { LoginDialog } from '../../components/auth/LoginDialog';
import { SignupDialog } from '../../components/auth/SignupDialogNew';

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Products', href: '/products' },
    { name: 'Services', href: '/services' },
    { name: 'Offers', href: '/offers' },
    { name: 'About Us', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

export function Header() {
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      // The AuthProvider logout function now handles the redirect
    } catch (error) {
      logger.error('Logout error:', { error });
      // Emergency fallback: force redirect even if logout failed
      window.location.href = '/';
    }
  };

  const handleDashboardRedirect = () => {
    if (!user) return;
    
    let dashboardPath = '/';
    switch (user.role) {
      case 'superadmin':
      case 'admin':
        dashboardPath = '/management/admin';
        break;
      case 'sales':
      case 'manager':
        dashboardPath = '/management/sales';
        break;
      case 'accounts':
        dashboardPath = '/management/accounts';
        break;
      default:
        dashboardPath = '/'; // Fallback for customers
    }
    
    // Use window.location for immediate navigation
    window.location.href = dashboardPath;
  };

  return (
    <header className="header-custom sticky top-0 z-50 w-full">
      <div className="container mx-auto px-4">
        {/* Top row with logo, navigation, and user controls */}
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 text-blue-800 transition-all duration-300 hover:text-blue-900 hover:scale-105 shadow-button rounded-lg px-2 py-1"
              onClick={() => {
                // Force navigation for logo click
                if (window.location.pathname !== '/') {
                  window.location.href = '/';
                }
              }}
            >
              <DynamicLogo className="h-8 w-8" />
              <span className="hidden sm:inline text-xl font-bold bg-gradient-to-r from-blue-700 to-blue-600 bg-clip-text text-transparent">TecBunny</span>
            </Link>
             <nav className="hidden md:flex items-center gap-4">
               {navLinks.map(link => (
                  <Link 
                    key={link.name} 
                    href={link.href} 
                    className="text-sm font-medium text-blue-700 transition-all duration-200 hover:text-blue-900 hover:bg-blue-100/50 rounded-md px-3 py-2 shadow-button"
                    onClick={(e) => {
                      // Prevent default and use window.location for reliable navigation
                      e.preventDefault();
                      if (window.location.pathname !== link.href) {
                        window.location.href = link.href;
                      }
                    }}
                  >
                      {link.name}
                  </Link>
               ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <CartSheet>
                  <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                      <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0"
                      >
                      {cartCount}
                      </Badge>
                  )}
                  <span className="sr-only">Open Cart</span>
                  </Button>
              </CartSheet>

              <Button variant="ghost" size="icon" className="relative" disabled>
                  <Heart className="h-5 w-5" />
                  {wishlistCount > 0 && (
                      <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0"
                      >
                      {wishlistCount}
                      </Badge>
                  )}
                  <span className="sr-only">Wishlist</span>
              </Button>
               {user ? (
                  <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" className="rounded-full">
                      <User className="h-5 w-5" />
                      <span className="sr-only">User Menu</span>
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
            {user.role !== 'customer' && (
                          <DropdownMenuItem onClick={handleDashboardRedirect} className="cursor-pointer">
                {/* Show shield for admin+ */}
                {['admin','superadmin'].includes(user.role) && <Shield className="mr-2 h-4 w-4" />}
                              {(user.role === 'sales' || user.role === 'manager') && <Briefcase className="mr-2 h-4 w-4" />}
                              {user.role === 'accounts' && <FileText className="mr-2 h-4 w-4" />}
                              <span>Dashboard</span>
                          </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          window.location.href = '/profile';
                        }}
                      >
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          window.location.href = '/orders';
                        }}
                      >
                        <Package className="mr-2 h-4 w-4" />
                        Orders
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                      </DropdownMenuItem>
                  </DropdownMenuContent>
                  </DropdownMenu>
              ) : (
                  <div className="flex items-center gap-2">
                  <LoginDialog>
                      <Button variant="ghost" size="sm">
                      Login
                      </Button>
                  </LoginDialog>
                  <SignupDialog>
                      <Button size="sm">
                          Sign Up
                      </Button>
                  </SignupDialog>
                  </div>
              )}
            </div>
           
            <div className="md:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                       <Button variant="ghost" size="icon">
                          <Menu className="h-6 w-6" />
                          <span className="sr-only">Open menu</span>
                      </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-full max-w-sm">
                      <SheetHeader className="sr-only">
                          <SheetTitle>Mobile Menu</SheetTitle>
                          <SheetDescription>Main navigation and account options for mobile users.</SheetDescription>
                      </SheetHeader>
                       <div className="flex justify-between items-center mb-6">
                           <Link
                              href="/"
                              className="flex items-center gap-2 text-primary"
                              onClick={(e) => {
                                e.preventDefault();
                                setMobileMenuOpen(false);
                                setTimeout(() => {
                                  if (window.location.pathname !== '/') {
                                    window.location.href = '/';
                                  }
                                }, 100);
                              }}
                          >
                              <DynamicLogo className="h-8 w-8" />
                              <span className="text-xl font-bold">TecBunny</span>
                          </Link>
                          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                              <X className="h-6 w-6" />
                          </Button>
                       </div>
                       <nav className="flex flex-col gap-4 mb-8">
                          {navLinks.map(link => (
                              <Link 
                                key={link.name} 
                                href={link.href} 
                                className="text-lg font-medium text-foreground hover:text-primary" 
                                onClick={(e) => {
                                  e.preventDefault();
                                  setMobileMenuOpen(false);
                                  // Small delay to allow sheet to close, then navigate
                                  setTimeout(() => {
                                    if (window.location.pathname !== link.href) {
                                      window.location.href = link.href;
                                    }
                                  }, 100);
                                }}
                              >
                                  {link.name}
                              </Link>
                          ))}
                       </nav>
                       <div className="flex items-center gap-4">
                          <CartSheet>
                              <Button variant="ghost" size="icon" className="relative">
                                  <ShoppingCart className="h-5 w-5" />
                                  {cartCount > 0 && <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0">{cartCount}</Badge>}
                                  <span className="sr-only">Open Cart</span>
                              </Button>
                          </CartSheet>

                          <Button variant="ghost" size="icon" className="relative" disabled>
                              <Heart className="h-5 w-5" />
                              {wishlistCount > 0 && <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0">{wishlistCount}</Badge>}
                              <span className="sr-only">Wishlist</span>
                          </Button>
                       </div>
                        <div className="mt-auto pt-6 border-t">
                              {user ? (
                                  <div className="space-y-4">
                                       <div className="flex items-center gap-3">
                                          <User className="h-8 w-8 text-primary"/>
                                          <div>
                                              <p className="font-semibold">{user.name}</p>
                                              <p className="text-sm text-muted-foreground">{user.email}</p>
                                          </div>
                                      </div>
                                      {user.role !== 'customer' && (
                                        <Button 
                                          className="w-full justify-start" 
                                          variant="ghost" 
                                          onClick={() => {
                                            setMobileMenuOpen(false);
                                            setTimeout(() => {
                                              handleDashboardRedirect();
                                            }, 100);
                                          }}
                                        >
                                          Dashboard
                                        </Button>
                                      )}
                                      <Button 
                                        className="w-full justify-start" 
                                        variant="ghost"
                                        onClick={() => {
                                          setMobileMenuOpen(false);
                                          window.location.href = '/profile';
                                        }}
                                      >
                                        Profile
                                      </Button>
                                      <Button 
                                        className="w-full justify-start" 
                                        variant="ghost" 
                                        asChild
                                      >
                                        <Link href="/orders">My Orders</Link>
                                      </Button>
                                      <Button 
                                        className="w-full justify-start" 
                                        variant="ghost" 
                                        onClick={() => {
                                          setMobileMenuOpen(false);
                                          setTimeout(() => {
                                            handleLogout();
                                          }, 100);
                                        }}
                                      >
                                        Logout
                                      </Button>
                                  </div>
                              ) : (
                                  <div className="space-y-4">
                                      <LoginDialog>
                                          <Button className="w-full">Login</Button>
                                      </LoginDialog>
                                      <SignupDialog>
                                          <Button variant="outline" className="w-full">
                                              Sign Up
                                          </Button>
                                      </SignupDialog>
                                  </div>
                              )}
                       </div>
                  </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
        
        {/* Search bar row */}
        <div className="border-t border-blue-100 py-3">
          <div className="flex justify-center">
            <div className="w-full max-w-2xl">
              <React.Suspense fallback={null}>
                <ProductSearch />
              </React.Suspense>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}