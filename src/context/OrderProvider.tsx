'use client';

import React, { createContext, useState, useCallback, useContext } from 'react';

import type { Order, OrderItem, OrderStatus } from '../lib/types';
import { createClient } from '../lib/supabase/client';
import { useToast } from '../hooks/use-toast';
import { useCart } from '../lib/hooks';
import { useAuth } from '../lib/hooks';
import { logger } from '../lib/logger';
import { deserializeOrder, normalizeOrderStatus } from '../lib/orders/normalizers';
import { formatOrderNumber } from '../lib/order-utils';

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

  const createOrder = useCallback(async (orderData: Partial<Order>): Promise<Order | null> => {
    setIsProcessingOrder(true);
    try {
      if (!user) {
        toast({
          title: 'Login Required',
          description: 'Please sign in before placing an order.',
          variant: 'destructive'
        });
        return null;
      }

      const customerName = orderData.customer_name || user.name || 'Customer';
      const customerEmail = orderData.customer_email || user.email || '';
      const customerPhone = orderData.customer_phone || user.mobile || '';
      
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

      const orderPayload = {
        customer_name: customerName,
        customer_id: user?.id || null,
        status: orderData.status || 'Pending',
        subtotal: Math.round(subtotal * 100) / 100,
        gst_amount: Math.round(gstAmount * 100) / 100,
        total: Math.round(total * 100) / 100,
        type: orderData.type || 'Delivery',
        items: orderItems,
        processed_by: orderData.processed_by || null,
        customer_email: customerEmail || null,
        customer_phone: customerPhone || null,
        delivery_address: orderData.delivery_address || null,
        pickup_store: orderData.pickup_store || null,
        notes: orderData.notes || null,
        payment_method: orderData.payment_method || null,
        payment_status: orderData.payment_status || null,
        discount_amount: Math.round(((orderData.discount_amount || 0) as number) * 100) / 100,
        shipping_amount: Math.round(((orderData.shipping_amount || 0) as number) * 100) / 100,
        agent_id: orderData.agent_id || null
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderPayload)
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        const errorMessage = result?.error?.message || 'Failed to create order. Please try again.';
        logger.error('OrderProvider API order creation failed', {
          status: response.status,
          error: result?.error,
        });
        toast({
          title: "Order Failed",
          description: errorMessage,
          variant: "destructive"
        });
        return null;
      }

      // Merge the database result with our full order data
      const createdOrder = deserializeOrder(result.order);
      const hydratedOrder: Order = {
        ...createdOrder,
        customer_email: createdOrder.customer_email ?? customerEmail,
        customer_phone: createdOrder.customer_phone ?? customerPhone,
        pickup_store: createdOrder.pickup_store ?? (orderData.pickup_store as string | undefined) ?? undefined,
        delivery_address: createdOrder.delivery_address ?? (orderData.delivery_address as string | undefined) ?? undefined,
      };

      setCurrentOrder(hydratedOrder);
      setOrders(prev => [hydratedOrder, ...prev]);
      
      // Clear cart after successful order
      clearCart();

      toast({
        title: "Order Created Successfully!",
        description: `Order #${formatOrderNumber(createdOrder.id)} has been placed.`,
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
  }, [cartItems, clearCart, toast, user]);

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

      const normalizedStatus = normalizeOrderStatus(status);

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
  }, [supabase]);

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
  }, [supabase]);

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
