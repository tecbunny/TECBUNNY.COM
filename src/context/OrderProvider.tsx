'use client';

import React, { createContext, useState, useCallback, useContext } from 'react';

import type { Order, OrderItem, OrderStatus } from '../lib/types';
import { createClient } from '../lib/supabase/client';
import { useToast } from '../hooks/use-toast';
import { useCart } from '../lib/hooks';
import { useAuth } from '../lib/hooks';
import { logger } from '../lib/logger';

const STATUS_MAP: Record<string, OrderStatus> = {
  pending: 'Pending',
  'awaiting payment': 'Awaiting Payment',
  'payment confirmed': 'Payment Confirmed',
  confirmed: 'Confirmed',
  processing: 'Processing',
  'ready to ship': 'Ready to Ship',
  shipped: 'Shipped',
  'ready for pickup': 'Ready for Pickup',
  completed: 'Completed',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  rejected: 'Rejected'
};

interface OrderContextType {
  orders: Order[];
  currentOrder: Order | null;
  isProcessingOrder: boolean;
  createOrder: (orderData: Partial<Order>) => Promise<Order | null>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<boolean>;
  getOrders: (customerId?: string) => Promise<void>;
  getOrderById: (orderId: string) => Promise<Order | null>;
  cancelOrder: (orderId: string) => Promise<boolean>;
}

export const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const { toast } = useToast();
  const { cartItems, clearCart } = useCart();
  const { user } = useAuth();
  const supabase = createClient();

  const parseOrderItemsBlob = useCallback((rawItems: unknown) => {
    if (!rawItems) return null;
    try {
      if (typeof rawItems === 'string') {
        return JSON.parse(rawItems);
      }
      if (typeof rawItems === 'object') {
        return rawItems as Record<string, unknown>;
      }
    } catch (error) {
      logger.warn('OrderProvider failed to parse order items blob', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }, []);

  const deserializeOrder = useCallback((rawOrder: any): Order => {
    const itemsPayload = parseOrderItemsBlob(rawOrder?.items);

    const parsedItems: OrderItem[] = Array.isArray(rawOrder?.items)
      ? rawOrder.items as OrderItem[]
      : Array.isArray(itemsPayload?.cart_items)
        ? itemsPayload.cart_items as OrderItem[]
        : [];

    const statusKey = typeof rawOrder?.status === 'string' ? rawOrder.status.toLowerCase() : '';
    const normalizedStatus = STATUS_MAP[statusKey] ?? (rawOrder?.status ?? 'Pending');

    return {
      ...rawOrder,
      status: normalizedStatus,
      items: parsedItems,
      customer_email: itemsPayload?.customer_email ?? rawOrder?.customer_email ?? undefined,
      customer_phone: itemsPayload?.customer_phone ?? rawOrder?.customer_phone ?? undefined,
      delivery_address: itemsPayload?.delivery_address ?? rawOrder?.delivery_address ?? undefined,
      payment_method: itemsPayload?.payment_method ?? rawOrder?.payment_method ?? undefined,
      notes: itemsPayload?.customer_notes ?? rawOrder?.notes ?? undefined,
    } as Order;
  }, [parseOrderItemsBlob]);

  const createOrder = useCallback(async (orderData: Partial<Order>): Promise<Order | null> => {
    setIsProcessingOrder(true);
    try {
      // Allow guest orders - use provided customer info or fallback to user info
      const customerName = orderData.customer_name || user?.name || 'Guest Customer';
      const customerEmail = orderData.customer_email || user?.email || '';
      const customerPhone = orderData.customer_phone || user?.mobile || '';
      
      // Validate required fields
      if (!customerName || !customerEmail || !customerPhone) {
        toast({
          title: "Missing Information",
          description: "Please provide your name, email, and phone number.",
          variant: "destructive"
        });
        return null;
      }

      // Calculate totals
      const subtotal = cartItems.reduce((total, item) => {
        const price = item.price;
        const gstRate = item.gstRate || 18; // Default 18% GST
        const basePrice = price / (1 + (gstRate / 100));
        return total + basePrice * item.quantity;
      }, 0);

      const gstAmount = cartItems.reduce((total, item) => {
        const price = item.price;
        const gstRate = item.gstRate || 18;
        const basePrice = price / (1 + (gstRate / 100));
        const gst = basePrice * (gstRate / 100);
        return total + gst * item.quantity;
      }, 0);

      const total = subtotal + gstAmount;

      // Convert cart items to order items
      const orderItems: OrderItem[] = cartItems.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        price: item.price,
        gstRate: item.gstRate || 18,
        hsnCode: item.hsnCode || '9999',
        name: item.name,
        serialNumbers: []
      }));

      const newOrder: Omit<Order, 'id'> = {
        customer_name: customerName,
        customer_id: user?.id || null, // Allow null for guest orders
        created_at: new Date().toISOString(),
        status: 'Pending',
        subtotal: Math.round(subtotal * 100) / 100,
        gst_amount: Math.round(gstAmount * 100) / 100,
        total: Math.round(total * 100) / 100,
        type: orderData.type || 'Delivery',
        items: orderItems,
        processed_by: orderData.processed_by,
        // Store additional info in a temporary way until we can add the columns
        customer_email: customerEmail,
        customer_phone: customerPhone,
        delivery_address: orderData.delivery_address,
        notes: orderData.notes,
        payment_method: orderData.payment_method
      };

      // For now, only insert the fields that exist in the database
      // Store additional info in notes field as JSON until we add proper columns
      // Store additional customer info in items field as JSON
      // Since the database has customer_name but we need email, phone, address, etc.
      const orderItemsWithCustomerInfo = {
        cart_items: orderItems,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        delivery_address: orderData.delivery_address,
        payment_method: orderData.payment_method,
        customer_notes: orderData.notes
      };

      // Only insert fields that exist in the database schema
      // Available fields: id, customer_name, customer_id, status, subtotal, gst_amount, total, type, items, processed_by, created_at
      const orderToInsert = {
        customer_name: newOrder.customer_name,
        customer_id: newOrder.customer_id,
        status: newOrder.status,
        subtotal: newOrder.subtotal,
        gst_amount: newOrder.gst_amount,
        total: newOrder.total,
        type: newOrder.type,
        items: JSON.stringify(orderItemsWithCustomerInfo),
        processed_by: null
      };

      // Insert order into database
      const { data, error } = await supabase
        .from('orders')
        .insert([orderToInsert])
        .select()
        .single();

      if (error) {
        toast({
          title: "Order Failed",
          description: "Failed to create order. Please try again.",
          variant: "destructive"
        });
        return null;
      }

      // Merge the database result with our full order data
      const createdOrder = deserializeOrder(data);
      const hydratedOrder: Order = {
        ...createdOrder,
        customer_email: createdOrder.customer_email ?? customerEmail,
        customer_phone: createdOrder.customer_phone ?? customerPhone,
      };

      setCurrentOrder(hydratedOrder);
      setOrders(prev => [hydratedOrder, ...prev]);
      
      // Clear cart after successful order
      clearCart();

      // Send order confirmation email
      try {
        await fetch('/api/email/order-confirmation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: customerEmail,
            orderData: hydratedOrder
          }),
        });
  } catch (_emailError) {
        // Don't fail the order creation if email fails
      }

      toast({
        title: "Order Created Successfully!",
        description: `Order #${createdOrder.id.slice(0, 8)} has been placed.`,
      });

  return hydratedOrder;
    } catch (error) {
      logger.error('OrderProvider failed to create order', {
        error: error instanceof Error ? error.message : String(error),
        payload: orderData,
      });
      toast({
        title: "Order Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsProcessingOrder(false);
    }
  }, [cartItems, clearCart, deserializeOrder, supabase, toast, user]);

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        toast({
          title: "Update Failed",
          description: "Failed to update order status.",
          variant: "destructive"
        });
        return false;
      }

      const normalizedStatus = typeof status === 'string'
        ? STATUS_MAP[status.toLowerCase()] ?? status
        : status;

      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status: normalizedStatus } : order
      ));

      if (currentOrder?.id === orderId) {
        setCurrentOrder(prev => prev ? { ...prev, status: normalizedStatus } : null);
      }

      toast({
        title: "Order Updated",
        description: `Order status updated to ${normalizedStatus}.`,
      });

      return true;
    } catch (error) {
      logger.error('Error updating order status', { error, orderId, status });
      return false;
    }
  }, [currentOrder, supabase, toast]);

  const getOrders = useCallback(async (customerId?: string): Promise<void> => {
    try {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;

      if (error) {
        return;
      }

  const normalizedOrders = (data ?? []).map(deserializeOrder);
      setOrders(normalizedOrders);
    } catch (error) {
      logger.error('OrderProvider getOrders failed', {
        error: error instanceof Error ? error.message : String(error),
        customerId,
      });
    }
  }, [deserializeOrder, supabase]);

  const getOrderById = useCallback(async (orderId: string): Promise<Order | null> => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) {
        return null;
      }

      const order = deserializeOrder(data);
      setCurrentOrder(order);
      return order;
    } catch (error) {
      logger.error('OrderProvider getOrderById failed', {
        error: error instanceof Error ? error.message : String(error),
        orderId,
      });
      return null;
    }
  }, [deserializeOrder, supabase]);

  const cancelOrder = useCallback(async (orderId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'Cancelled' as OrderStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        toast({
          title: "Cancellation Failed",
          description: "Failed to cancel order.",
          variant: "destructive"
        });
        return false;
      }

      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status: 'Cancelled' as OrderStatus } : order
      ));

      if (currentOrder?.id === orderId) {
        setCurrentOrder(prev => prev ? { ...prev, status: 'Cancelled' as OrderStatus } : null);
      }

      toast({
        title: "Order Cancelled",
        description: "Order has been cancelled successfully.",
      });

      return true;
    } catch (error) {
      logger.error('OrderProvider cancelOrder failed', {
        error: error instanceof Error ? error.message : String(error),
        orderId,
      });
      return false;
    }
  }, [currentOrder, supabase, toast]);

  const value = {
    orders,
    currentOrder,
    isProcessingOrder,
    createOrder,
    updateOrderStatus,
    getOrders,
    getOrderById,
    cancelOrder,
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
};
