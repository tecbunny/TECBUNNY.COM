
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../components/ui/form';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import type { Coupon, Product, Discount } from '../../lib/types';
import { createClient } from '../../lib/supabase/client';
import { logger } from '../../lib/logger';

// Coupon schema (requires code)
const couponSchema = z.object({
  code: z.string().min(3, 'Code must be at least 3 characters.'),
  type: z.enum(['percentage', 'fixed']),
  value: z.coerce.number().positive('Value must be positive.'),
  min_purchase: z.coerce.number().optional(),
  applicableTo: z.enum(['all', 'category', 'product']),
  applicable_category: z.string().optional(),
  applicable_product_id: z.string().optional(),
});

// Auto-discount schema (no code, uses name)
const autoDiscountSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters.'),
  type: z.enum(['percentage', 'fixed']),
  value: z.coerce.number().positive('Value must be positive.'),
  min_purchase: z.coerce.number().optional(),
  applicableTo: z.enum(['all', 'category', 'product']),
  applicable_category: z.string().optional(),
  applicable_product_id: z.string().optional(),
});

type CouponValues = z.infer<typeof couponSchema>;
type AutoDiscountValues = z.infer<typeof autoDiscountSchema>;

interface CreateDiscountDialogProps {
  children: React.ReactNode;
  onDiscountCreated: (discount: Coupon | Discount) => void;
  mode?: 'discount' | 'coupon'; // 'discount' means auto-applied
}

export function CreateDiscountDialog({ children, onDiscountCreated, mode = 'discount' }: CreateDiscountDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [products, setProducts] = React.useState<Product[]>([]);
  const supabase = createClient();

  const isCoupon = mode === 'coupon';
  // Use 'any' for form generic to bypass complex union inference; runtime safety handled by zod
  const form = useForm<any>({
    // Cast schema to any to avoid union inference TS issue
    resolver: zodResolver((isCoupon ? couponSchema : autoDiscountSchema) as any),
    defaultValues: isCoupon ? {
      code: '',
      type: 'percentage',
      value: 10,
      applicableTo: 'all',
      min_purchase: 0,
      applicable_category: '',
      applicable_product_id: '',
    } : {
      name: '',
      type: 'percentage',
      value: 10,
      applicableTo: 'all',
      min_purchase: 0,
      applicable_category: '',
      applicable_product_id: '',
    }
  });

  React.useEffect(() => {
    const fetchProducts = async () => {
        const { data, error } = await supabase.from('products').select('*');
        if (!error && data) {
            setProducts(data);
        }
    }
    fetchProducts();
  }, [supabase]);
  
  const applicableTo = form.watch('applicableTo');
  
  const categories = React.useMemo(() => {
    const categorySet = new Set<string>();
    products.forEach(p => categorySet.add(p.category));
    return Array.from(categorySet);
  }, [products]);

  const onSubmit = async (data: any) => {
    if (isCoupon) {
      const payload = {
        code: (data as CouponValues).code.toUpperCase(),
        type: (data as CouponValues).type,
        value: (data as CouponValues).value,
        start_date: new Date().toISOString(),
        expiry_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        min_purchase: (data as CouponValues).min_purchase,
        usage_limit: 0,
        usage_count: 0,
        per_user_limit: 0,
        status: 'active',
        applicable_category: (data as CouponValues).applicableTo === 'category' ? (data as CouponValues).applicable_category : undefined,
        applicable_product_id: (data as CouponValues).applicableTo === 'product' ? (data as CouponValues).applicable_product_id : undefined,
      };
      const { data: inserted, error } = await supabase.from('coupons').insert(payload).select().single();
      if (!error && inserted) {
        onDiscountCreated(inserted as Coupon);
        form.reset();
        setOpen(false);
      } else {
        logger.error('Failed to create coupon in CreateDiscountDialog', { error, payload });
      }
    } else {
      const payload = {
        name: (data as AutoDiscountValues).name,
        type: (data as AutoDiscountValues).type,
        value: (data as AutoDiscountValues).value,
        start_date: new Date().toISOString(),
        expiry_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        min_purchase: (data as AutoDiscountValues).min_purchase,
        status: 'active',
        applicable_category: (data as AutoDiscountValues).applicableTo === 'category' ? (data as AutoDiscountValues).applicable_category : undefined,
        applicable_product_id: (data as AutoDiscountValues).applicableTo === 'product' ? (data as AutoDiscountValues).applicable_product_id : undefined,
        priority: 0,
      };
      const { data: inserted, error } = await supabase.from('discounts').insert(payload).select().single();
      if (!error && inserted) {
        onDiscountCreated(inserted as Discount);
        form.reset();
        setOpen(false);
      } else {
        logger.error('Failed to create discount in CreateDiscountDialog', { error, payload });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'coupon' ? 'Create New Coupon' : 'Create New Discount'}</DialogTitle>
          <DialogDescription>
            {mode === 'coupon' ? 'Fill in the details to create a new coupon.' : 'Fill in the details to create a new discount or coupon.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            {isCoupon ? (
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coupon Code</FormLabel>
                    <FormControl><Input placeholder="e.g., SUMMER20" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Summer Sale" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                        </SelectContent>
                     </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
                control={form.control}
                name="min_purchase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Purchase (₹, Optional)</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 1000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="applicableTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Applies To</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="all">All Products</SelectItem>
                            <SelectItem value="category">Specific Category</SelectItem>
                            <SelectItem value="product">Specific Product</SelectItem>
                        </SelectContent>
                     </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {applicableTo === 'category' && (
                <FormField
                    control={form.control}
                    name="applicable_category"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              )}

              {applicableTo === 'product' && (
                 <FormField
                    control={form.control}
                    name="applicable_product_id"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Product</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a product" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              )}


            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Discount'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}