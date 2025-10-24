import { NextRequest, NextResponse } from 'next/server';

import { logger } from '../../../../lib/logger';
import { AdminAuthError, requireAdminContext } from '../../../../lib/auth/admin-guard';
import { isSupabaseServiceConfigured } from '../../../../lib/supabase/server';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TOTAL_FIELDS = ['total'] as const;

function coerceCurrency(order: Record<string, unknown>): number {
  for (const field of TOTAL_FIELDS) {
    const value = order[field];
    if (value === null || value === undefined) continue;
    const numeric = typeof value === 'number' ? value : parseFloat(String(value));
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
  }
  return 0;
}

export async function GET(_request: NextRequest) {
  if (!isSupabaseServiceConfigured) {
    logger.error('admin_dashboard.misconfigured_supabase');
    return NextResponse.json(
      { error: 'Service configuration missing. Please set SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 503 }
    );
  }

  try {
    const { serviceSupabase, user, role } = await requireAdminContext();

    logger.info('admin_dashboard.fetch_start', { userId: user.id, role });

    // Fetch user count
    const { count: userCount, error: usersError } = await serviceSupabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (usersError) {
      logger.error('admin_dashboard.users_count_error', { error: usersError.message, code: usersError.code });
      throw usersError;
    }

    // Fetch product count
    const { count: productCount, error: productsError } = await serviceSupabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (productsError) {
      logger.error('admin_dashboard.products_count_error', { error: productsError.message, code: productsError.code });
      throw productsError;
    }

    // Fetch orders with totals
    const { data: orders, error: ordersError } = await serviceSupabase
      .from('orders')
      .select('id, total, created_at, status')
      .order('created_at', { ascending: false });

    if (ordersError) {
      logger.error('admin_dashboard.orders_fetch_error', { error: ordersError.message, code: ordersError.code });
      throw ordersError;
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyOrders = (orders ?? []).filter(order => {
      if (!order.created_at) return false;
      const orderDate = new Date(order.created_at as string);
      return orderDate.getFullYear() === currentYear &&
        orderDate.getMonth() === currentMonth &&
        order.status !== 'cancelled';
    });

    const monthlyRevenue = monthlyOrders.reduce((total, order) => total + coerceCurrency(order), 0);

    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const lastMonth = lastMonthDate.getMonth();
    const lastMonthYear = lastMonthDate.getFullYear();

    const lastMonthOrders = (orders ?? []).filter(order => {
      if (!order.created_at) return false;
      const orderDate = new Date(order.created_at as string);
      return orderDate.getFullYear() === lastMonthYear &&
        orderDate.getMonth() === lastMonth &&
        order.status !== 'cancelled';
    });

    const recentActivity = (orders ?? [])
      .slice(0, 5)
      .map(order => ({
        id: order.id,
        type: 'order',
        description: `Order #${order.id} - ₹${coerceCurrency(order).toLocaleString('en-IN')}`,
        date: order.created_at,
        status: order.status
      }));

    const stats = {
      totalUsers: userCount ?? 0,
      totalProducts: productCount ?? 0,
      totalOrders: orders?.length ?? 0,
      monthlyRevenue,
      monthlyOrders: monthlyOrders.length,
      lastMonthOrders: lastMonthOrders.length,
      recentActivity
    };

    logger.info('admin_dashboard.fetch_success', { stats });

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    logger.error('admin_dashboard.unhandled_error', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}