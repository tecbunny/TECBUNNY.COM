'use client';

import * as React from 'react';

import { RefreshCw } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Skeleton } from '../../../../components/ui/skeleton';
import type { Order, OrderType, OrderStatus } from '../../../../lib/types';
import { deserializeOrder } from '../../../../lib/orders/normalizers';
import { useToast } from '../../../../hooks/use-toast';
import { createClient } from '../../../../lib/supabase/client';
import { OrderActions } from '../../../../components/sales/OrderActions';
import { formatOrderNumber } from '../../../../lib/order-utils';

const STATUS_VARIANT: Record<OrderStatus, 'default' | 'destructive' | 'outline' | 'secondary'> = {
  'Pending': 'outline',
  'Awaiting Payment': 'destructive',
  'Payment Confirmed': 'default',
  'Confirmed': 'default',
  'Processing': 'default',
  'Ready to Ship': 'default',
  'Shipped': 'secondary',
  'Ready for Pickup': 'default',
  'Completed': 'outline',
  'Delivered': 'outline',
  'Cancelled': 'destructive',
  'Rejected': 'destructive',
};

const TYPE_BADGE_CLASS: Record<OrderType, string> = {
  Delivery: 'bg-blue-100 text-blue-800',
  Pickup: 'bg-amber-100 text-amber-800',
  'Walk-in': 'bg-emerald-100 text-emerald-800',
};

type TypeFilter = 'all' | OrderType;

export default function AdminOrders() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>('all');
  const { toast } = useToast();
  const supabase = createClient();

  const fetchOrders = React.useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching admin orders:', error);
      toast({
        variant: 'destructive',
        title: 'Order fetch failed',
        description: 'Unable to load orders. Please try again.',
      });
    } else {
      const normalizedOrders = (data ?? []).map(deserializeOrder);
      setOrders(normalizedOrders);
    }

    setLoading(false);
  }, [supabase, toast]);

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = React.useMemo(() => {
    if (typeFilter === 'all') return orders;
    return orders.filter(order => order.type === typeFilter);
  }, [orders, typeFilter]);

  const getStatusBadgeVariant = (status: OrderStatus) => STATUS_VARIANT[status] ?? 'outline';

  const getTypeBadgeClass = (type: OrderType | null | undefined) => {
    if (!type || !(type in TYPE_BADGE_CLASS)) {
      return 'bg-gray-100 text-gray-700';
    }
    return TYPE_BADGE_CLASS[type as OrderType];
  };

  const getStatusLabel = (order: Order) => {
    if (['Awaiting Payment', 'Pending'].includes(order.status) && (order.payment_method ?? '').toLowerCase() === 'upi') {
      return 'Payment Confirmation Pending';
    }
    return order.status;
  };

  const getPaymentStatusLabel = (order: Order) => {
    if (order.payment_status && order.payment_status.trim().length > 0) {
      return order.payment_status;
    }

    if (['Awaiting Payment', 'Pending'].includes(order.status)) {
      return (order.payment_method ?? '').toLowerCase() === 'upi'
        ? 'Payment Confirmation Pending'
        : 'Awaiting Payment';
    }

    if (['Payment Confirmed', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Ready for Pickup', 'Completed', 'Delivered'].includes(order.status)) {
      return 'Payment Confirmed';
    }

    if (['Cancelled', 'Rejected'].includes(order.status)) {
      return 'Payment Cancelled';
    }

    return 'Pending';
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Order Management</h1>
          <p className="text-muted-foreground">Monitor and control every order across the storefront.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}>
            <SelectTrigger className="min-w-[160px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All order types</SelectItem>
              <SelectItem value="Delivery">Delivery</SelectItem>
              <SelectItem value="Pickup">Pickup</SelectItem>
              <SelectItem value="Walk-in">Walk-in</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={loading}
            onClick={fetchOrders}
          >
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-800">
            Admins can review, update, and cancel any order. Use the actions menu in each row to adjust order status,
            print invoices, or drill into a full order view.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>Recent orders across all channels.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Placed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <TableRow key={`admin-order-skeleton-${index}`}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    No orders found for the selected filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{formatOrderNumber(order.id)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{order.customer_name || 'Unknown customer'}</p>
                        {order.customer_email && (
                          <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                        )}
                        {order.customer_phone && (
                          <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getTypeBadgeClass(order.type)}`}>
                        {order.type || 'Unknown'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{new Date(order.created_at).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(order.status)}>{getStatusLabel(order)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <p>{order.payment_method ? order.payment_method.toUpperCase() : 'Not set'}</p>
                        <p className="text-muted-foreground">{getPaymentStatusLabel(order)}</p>
                        {order.payment_reference && (
                          <p className="text-xs text-muted-foreground">Ref: {order.payment_reference}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">₹{order.total.toFixed(2)}</p>
                        {(order.discount_amount || order.shipping_amount) && (
                          <p className="text-xs text-muted-foreground">
                            {order.discount_amount ? `Disc: ₹${order.discount_amount.toFixed(2)}` : ''}
                            {order.shipping_amount ? ` Ship: ₹${order.shipping_amount.toFixed(2)}` : ''}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <OrderActions order={order} onStatusUpdate={fetchOrders} variant="dropdown" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
