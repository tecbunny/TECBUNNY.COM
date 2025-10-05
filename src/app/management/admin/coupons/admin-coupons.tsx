
'use client';

import * as React from 'react';

import { MoreHorizontal, PlusCircle } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { Button } from '../../../../components/ui/button';
import type { Coupon } from '../../../../lib/types';
import { Badge } from '../../../../components/ui/badge';
import { createClient } from '../../../../lib/supabase/client';
import { CreateDiscountDialog } from '../../../../components/admin/CreateDiscountDialog';
import type { Discount } from '../../../../lib/types';
import { useToast } from '../../../../hooks/use-toast';

export default function CouponManagementPage() {
  const [coupons, setCoupons] = React.useState<Coupon[]>([]);
  const supabase = createClient();
  const { toast } = useToast();

  React.useEffect(() => {
    const fetchCoupons = async () => {
        const { data, error } = await supabase.from('coupons').select('*');
        if (error) {
            console.error('Failed to fetch coupons:', error);
        } else {
            setCoupons(data as Coupon[]);
        }
    }
    fetchCoupons();
  }, [supabase]);

  const handleCouponCreated = (created: Coupon | Discount) => {
    // Guard: only add if it's a coupon (has code property)
    if ('code' in created) {
      const newCoupon = created as Coupon;
      setCoupons(prev => [...prev, newCoupon]);
      toast({
        title: 'Coupon Created',
        description: `The coupon "${newCoupon.code}" has been successfully created.`,
      });
    }
  };

  const getStatusVariant = (status: string) => {
    return status === 'active' ? 'secondary' : 'destructive';
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Coupon Management</h1>
        <p className="text-muted-foreground">
          Create and manage discount coupons for your store.
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>All Coupons</CardTitle>
            <CardDescription>
              A list of all active and inactive coupons.
            </CardDescription>
          </div>
          <CreateDiscountDialog onDiscountCreated={handleCouponCreated} mode="coupon">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Coupon
            </Button>
          </CreateDiscountDialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-mono">{coupon.code}</TableCell>
                  <TableCell className="capitalize">{coupon.type}</TableCell>
                  <TableCell>{coupon.type === 'fixed' ? `₹${coupon.value}` : `${coupon.value}%`}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(coupon.status)} className="capitalize">{coupon.status}</Badge>
                  </TableCell>
                  <TableCell>{new Date(coupon.expiry_date).toLocaleDateString()}</TableCell>
                  <TableCell>{coupon.usage_count} / {coupon.usage_limit}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" disabled>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}