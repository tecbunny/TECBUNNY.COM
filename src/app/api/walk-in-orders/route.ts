import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { logger } from '../../../lib/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'store-orders') {
      const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
      
      // Fetch orders without problematic joins
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .or('type.eq.Walk-in,type.eq.Pickup')
        .gte('created_at', `${date}T00:00:00`)
        .lt('created_at', `${date}T23:59:59`)
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch store orders', details: { message: error.message } },
          { status: 500 }
        );
      }

      // Get order items separately for each order
      const ordersWithItems = await Promise.all(
        (orders || []).map(async (order) => {
          const { data: items } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id);
          
          return {
            ...order,
            order_items: items || []
          };
        })
      );

      return NextResponse.json({ orders: ordersWithItems });
    }

    if (action === 'daily-stats') {
      const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
      
      const { data: orders, error } = await supabase
        .from('orders')
        .select('total, status')
        .or('type.eq.Walk-in,type.eq.Pickup')
        .gte('created_at', `${date}T00:00:00`)
        .lt('created_at', `${date}T23:59:59`);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch daily stats', details: { message: error.message } },
          { status: 500 }
        );
      }

      const stats = {
        totalOrders: orders?.length || 0,
        totalRevenue: orders?.reduce((sum: number, order: { total: string | number }) => sum + (parseFloat(String(order.total)) || 0), 0) || 0,
        completedOrders: orders?.filter((order: { status: string }) => order.status === 'Completed').length || 0,
        pendingOrders: orders?.filter((order: { status: string }) => order.status === 'Pending').length || 0
      };

      return NextResponse.json({ stats });
    }

    if (action === 'customer-orders') {
      const customerId = searchParams.get('customerId');
      const customerPhone = searchParams.get('phone');
      
      if (!customerId && !customerPhone) {
        return NextResponse.json(
          { error: 'Customer ID or phone number is required' },
          { status: 400 }
        );
      }

      let query = supabase
        .from('orders')
        .select('*')
        .or('type.eq.Walk-in,type.eq.Pickup')
        .order('created_at', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      } else if (customerPhone) {
        query = query.eq('customer_phone', customerPhone);
      }

      const { data: orders, error } = await query;

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch customer orders', details: { message: error.message } },
          { status: 500 }
        );
      }

      return NextResponse.json({ orders });
    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    );

  } catch (error) {
    logger.error('Walk-in orders API error:', { error });
    return NextResponse.json(
      { error: 'Internal server error', details: { message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 }
    );
  }
}

// Export a simple POST function for creating orders
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { action, ...data } = await request.json();

    if (action === 'create-order') {
      const { customer_name, customer_email, customer_phone, items, payment_method, notes } = data;
      
      // Calculate totals
      const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
      const gst_amount = subtotal * 0.18; // 18% GST
      const total = subtotal + gst_amount;

      // Create the order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name,
          customer_email,
          customer_phone,
          status: 'Pending',
          type: 'Walk-in',
          subtotal,
          gst_amount,
          total,
          payment_method,
          notes,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (orderError) {
        return NextResponse.json(
          { error: 'Failed to create order', details: orderError.message },
          { status: 500 }
        );
      }

      // Create order items
      const orderItems = items.map((item: any) => ({
        order_id: order.id,
        product_id: item.product_id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        gst_rate: 18
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        // Rollback order if items creation fails
        await supabase.from('orders').delete().eq('id', order.id);
        return NextResponse.json(
          { error: 'Failed to create order items', details: itemsError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ order, items: orderItems });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    logger.error('Walk-in orders POST error:', { error });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}