
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  LogOut,
  User,
  Users,
  Package,
  ShoppingCart,
  Settings,
  Shield,
  Ticket,
  Percent,
  Gift,
  LayoutTemplate,
  Images,
  CreditCard,
  Wrench,
  Share2,
  FileText,
  DollarSign,
  MessageCircle,
  Settings2,
} from 'lucide-react';

import { Logo } from '../../components/ui/logo';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../lib/hooks';

import { Separator } from '../ui/separator';

const navItems = [
  { href: '/management/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/management/admin/users', label: 'User Management', icon: Users },
  { href: '/management/admin/sales-agents', label: 'Sales Agents', icon: User },
  { href: '/management/admin/security', label: 'Security Dashboard', icon: Shield },
  { href: '/management/admin/orders', label: 'Order Management', icon: ShoppingCart },
  { href: '/management/admin/products', label: 'Product Catalog', icon: Package },
  { href: '/management/admin/pricing', label: 'Pricing Management', icon: DollarSign },
  { href: '/management/admin/custom-setups', label: 'Custom Setups', icon: Settings2 },
  { href: '/management/admin/services', label: 'Service Management', icon: Wrench },
  { href: '/management/admin/offers', label: 'Offers Management', icon: Gift },
  { href: '/management/admin/policies', label: 'Policies Management', icon: FileText },
  { href: '/management/admin/contact-messages', label: 'Contact Messages', icon: MessageCircle },
  { href: '/management/admin/coupons', label: 'Coupons', icon: Ticket },
  { href: '/management/admin/discounts', label: 'Discounts', icon: Percent },
  { href: '/management/admin/homepage-settings', label: 'Homepage Settings', icon: LayoutTemplate },
  { href: '/management/admin/hero-banners', label: 'Hero Banners', icon: Images },
  { href: '/management/admin/payment-api', label: 'Payment API', icon: CreditCard },
  { href: '/management/admin/social-media', label: 'Social Media', icon: Share2 },
  { href: '/management/admin/settings', label: 'Site Settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  // (Optional) Explicit prefetch safeguard; Next's Link prefetch covers this
  React.useEffect(() => {
    navItems.forEach(item => {
      try { (router as any).prefetch?.(item.href); } catch {}
    });
  }, [router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <aside className="hidden w-64 flex-col border-r bg-background p-4 sm:flex">
      <div className="flex items-center gap-2 mb-8">
        <Logo className="h-8 w-8 text-primary" />
        <span className="text-xl font-bold">TecBunny</span>
      </div>

      <nav className="flex-1 space-y-2">
        <p className="px-3 py-2 text-xs font-semibold text-muted-foreground">Overview</p>
        {navItems.map(item => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
                active && 'bg-muted text-primary',
                !active && 'hover:text-primary'
              )}
            >
              <item.icon className="h-4 w-4 pointer-events-none" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      
      <div className="mt-auto">
         <Separator className="my-4" />
         <div className="flex items-center gap-3 p-2 rounded-lg bg-muted">
            <div className="p-2 bg-primary/10 rounded-full">
                <Shield className="h-6 w-6 text-primary"/>
            </div>
            <div>
                <p className="text-sm font-semibold">{user?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
         </div>
         <Button variant="ghost" className="w-full justify-start gap-3 mt-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Logout
         </Button>
      </div>
    </aside>
  );
}