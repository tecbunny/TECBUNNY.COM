import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { logger } from '../../../../lib/logger';

export async function GET() {
  try {
    // Create Supabase client inside the function to avoid build-time errors
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    logger.info('admin_dashboard.fetch_start');

    // Fetch user count
    const { count: userCount, error: usersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (usersError) {
      logger.error('admin_dashboard.users_count_error', { error: usersError });
    }

    // Fetch product count
    const { count: productCount, error: productsError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (productsError) {
      logger.error('admin_dashboard.products_count_error', { error: productsError });
    }

    // Fetch order count and revenue
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, total, total_amount, created_at, status');

    if (ordersError) {
      logger.error('admin_dashboard.orders_fetch_error', { error: ordersError });
    }

    // Calculate monthly revenue
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const monthlyOrders = orders?.filter(order => {
      if (!order.created_at) return false;
      const orderDate = new Date(order.created_at);
      return orderDate.getMonth() === currentMonth && 
             orderDate.getFullYear() === currentYear &&
             order.status !== 'cancelled';
    }) || [];

    const monthlyRevenue = monthlyOrders.reduce((sum, order) => {
      const total = order.total || order.total_amount;
      return sum + (parseFloat(total?.toString() || '0') || 0);
    }, 0);

    // Calculate growth metrics
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const lastMonthOrders = orders?.filter(order => {
      if (!order.created_at) return false;
      const orderDate = new Date(order.created_at);
      return orderDate.getMonth() === lastMonth && 
             orderDate.getFullYear() === lastMonthYear &&
             order.status !== 'cancelled';
    }) || [];

    // Get recent activity
    const recentOrders = orders
      ?.filter(order => order.created_at)
      ?.sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
      ?.slice(0, 5) || [];

    const stats = {
      totalUsers: userCount || 0,
      totalProducts: productCount || 0,
      totalOrders: orders?.length || 0,
      monthlyRevenue,
      monthlyOrders: monthlyOrders.length,
      lastMonthOrders: lastMonthOrders.length,
      recentActivity: recentOrders.map(order => ({
        id: order.id,
        type: 'order',
        description: `Order #${order.id} - ₹${order.total || order.total_amount || 0}`,
        date: order.created_at,
        status: order.status
      }))
    };

  logger.info('admin_dashboard.fetch_success', { stats });

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    logger.error('admin_dashboard.unhandled_error', { error });
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' }, 
      { status: 500 }
    );
  }
}