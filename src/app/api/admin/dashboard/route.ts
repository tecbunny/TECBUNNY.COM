import { NextRequest, NextResponse } from 'next/server';

import { logger } from '../../../../lib/logger';
import { AdminAuthError, requireAdminContext } from '../../../../lib/auth/admin-guard';
import { isSupabaseServiceConfigured } from '../../../../lib/supabase/server';
import { formatOrderNumber } from '../../../../lib/order-utils';

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
    logger.warn('admin_dashboard.misconfigured_supabase');
  }

  try {
    const { serviceSupabase, user, role } = await requireAdminContext();

    logger.info('admin_dashboard.fetch_start', { userId: user.id, role });

    // Fetch users count from profiles (fast, avoids admin pagination)
    let totalUserCount = 0;
    const { count: usersCount, error: usersCountError } = await serviceSupabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (usersCountError) {
      logger.warn('admin_dashboard.users_count_error', { error: usersCountError.message, code: usersCountError.code });
    } else {
      totalUserCount = usersCount ?? 0;
    }

    // Fetch product count
    let productCount = 0;
    const { count: productCountRaw, error: productsError } = await serviceSupabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (productsError) {
      logger.warn('admin_dashboard.products_count_error', { error: productsError.message, code: productsError.code });
    } else {
      productCount = productCountRaw ?? 0;
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const startOfNextMonth = new Date(currentYear, currentMonth + 1, 1);
    const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);

    // Fetch total orders count
    let totalOrders = 0;
    const { count: totalOrdersRaw, error: ordersCountError } = await serviceSupabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    if (ordersCountError) {
      logger.warn('admin_dashboard.orders_count_error', { error: ordersCountError.message, code: ordersCountError.code });
    } else {
      totalOrders = totalOrdersRaw ?? 0;
    }

    // Fetch current month orders (for count + revenue)
    let monthlyOrdersCount = 0;
    let monthlyOrdersData: Array<Record<string, unknown>> = [];
    const { data: monthlyOrdersDataRaw, count: monthlyOrdersCountRaw, error: monthlyOrdersError } = await serviceSupabase
      .from('orders')
      .select('total, created_at, status', { count: 'exact' })
      .gte('created_at', startOfMonth.toISOString())
      .lt('created_at', startOfNextMonth.toISOString())
      .neq('status', 'cancelled');

    if (monthlyOrdersError) {
      logger.warn('admin_dashboard.monthly_orders_error', { error: monthlyOrdersError.message, code: monthlyOrdersError.code });
    } else {
      monthlyOrdersCount = monthlyOrdersCountRaw ?? 0;
      monthlyOrdersData = (monthlyOrdersDataRaw as Array<Record<string, unknown>>) ?? [];
    }

    const monthlyRevenue = (monthlyOrdersData ?? []).reduce((total, order) => total + coerceCurrency(order), 0);

    // Fetch last month orders count (no need to fetch all rows)
    let lastMonthOrdersCount = 0;
    const { count: lastMonthOrdersCountRaw, error: lastMonthOrdersError } = await serviceSupabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfLastMonth.toISOString())
      .lt('created_at', startOfMonth.toISOString())
      .neq('status', 'cancelled');

    if (lastMonthOrdersError) {
      logger.warn('admin_dashboard.last_month_orders_error', { error: lastMonthOrdersError.message, code: lastMonthOrdersError.code });
    } else {
      lastMonthOrdersCount = lastMonthOrdersCountRaw ?? 0;
    }

    // Fetch recent activity (last 5 orders only)
    let recentOrders: Array<Record<string, unknown>> = [];
    const { data: recentOrdersRaw, error: recentOrdersError } = await serviceSupabase
      .from('orders')
      .select('id, total, created_at, status')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentOrdersError) {
      logger.warn('admin_dashboard.recent_orders_error', { error: recentOrdersError.message, code: recentOrdersError.code });
    } else {
      recentOrders = (recentOrdersRaw as Array<Record<string, unknown>>) ?? [];
    }

    const recentActivity = (recentOrders ?? []).map(order => ({
      id: String(order.id ?? ''),
      type: 'order',
      description: `Order #${formatOrderNumber(String(order.id ?? ''))} - ₹${coerceCurrency(order).toLocaleString('en-IN')}`,
      date: String(order.created_at ?? ''),
      status: String(order.status ?? '')
    }));

    // ── Contact messages stats ────────────────────────────────────────────────
    let contactTotal = 0;
    let contactNewCount = 0;
    let contactInProgressCount = 0;
    let contactResolvedCount = 0;
    const { data: contactStatusData, error: contactStatusError } = await serviceSupabase
      .from('contact_messages')
      .select('status');
    if (contactStatusError) {
      logger.warn('admin_dashboard.contact_messages_error', { error: contactStatusError.message });
    } else if (contactStatusData) {
      contactTotal = contactStatusData.length;
      contactNewCount = contactStatusData.filter((r: { status: string }) => r.status === 'New').length;
      contactInProgressCount = contactStatusData.filter((r: { status: string }) => r.status === 'In Progress').length;
      contactResolvedCount = contactStatusData.filter((r: { status: string }) => r.status === 'Resolved').length;
    }

    // ── Service request breakdown by subject ─────────────────────────────────
    const serviceRequestBreakdown: Array<{ subject: string; count: number }> = [];
    const { data: subjectData, error: subjectError } = await serviceSupabase
      .from('contact_messages')
      .select('subject');
    if (!subjectError && subjectData) {
      const subjectCounts: Record<string, number> = {};
      for (const row of subjectData as Array<{ subject: string }>) {
        const key = row.subject || 'General';
        subjectCounts[key] = (subjectCounts[key] ?? 0) + 1;
      }
      for (const [subject, count] of Object.entries(subjectCounts)) {
        serviceRequestBreakdown.push({ subject, count });
      }
      serviceRequestBreakdown.sort((a, b) => b.count - a.count);
    }

    // ── Order status breakdown ────────────────────────────────────────────────
    const ordersByStatus: Array<{ status: string; count: number }> = [];
    const { data: orderStatusData, error: orderStatusError } = await serviceSupabase
      .from('orders')
      .select('status');
    if (!orderStatusError && orderStatusData) {
      const statusCounts: Record<string, number> = {};
      for (const row of orderStatusData as Array<{ status: string }>) {
        const key = row.status || 'unknown';
        statusCounts[key] = (statusCounts[key] ?? 0) + 1;
      }
      for (const [status, count] of Object.entries(statusCounts)) {
        ordersByStatus.push({ status, count });
      }
      ordersByStatus.sort((a, b) => b.count - a.count);
    }

    // ── Last 6 months revenue ─────────────────────────────────────────────────
    const revenueByMonth: Array<{ month: string; revenue: number }> = [];
    const sixMonthsAgo = new Date(currentYear, currentMonth - 5, 1);
    const { data: sixMonthOrdersRaw, error: sixMonthError } = await serviceSupabase
      .from('orders')
      .select('total, created_at')
      .gte('created_at', sixMonthsAgo.toISOString())
      .neq('status', 'cancelled');
    if (!sixMonthError && sixMonthOrdersRaw) {
      const monthMap: Record<string, number> = {};
      for (let i = 0; i < 6; i++) {
        const d = new Date(currentYear, currentMonth - 5 + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthMap[key] = 0;
      }
      for (const order of sixMonthOrdersRaw as Array<Record<string, unknown>>) {
        const d = new Date(String(order.created_at));
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (key in monthMap) monthMap[key] += coerceCurrency(order);
      }
      const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      for (const [key, revenue] of Object.entries(monthMap)) {
        const mIdx = parseInt(key.split('-')[1]) - 1;
        const yr = key.split('-')[0].slice(2);
        revenueByMonth.push({ month: `${MONTH_NAMES[mIdx]} '${yr}`, revenue });
      }
    }

    const stats = {
      totalUsers: totalUserCount ?? 0,
      totalProducts: productCount ?? 0,
      totalOrders: totalOrders ?? 0,
      monthlyRevenue,
      monthlyOrders: monthlyOrdersCount ?? 0,
      lastMonthOrders: lastMonthOrdersCount ?? 0,
      recentActivity,
      contactMessages: {
        total: contactTotal,
        newCount: contactNewCount,
        inProgressCount: contactInProgressCount,
        resolvedCount: contactResolvedCount,
      },
      serviceRequestBreakdown,
      ordersByStatus,
      revenueByMonth,
    };

    logger.info('admin_dashboard.fetch_success', { stats });

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    let message = error instanceof Error ? error.message : String(error);
    if (message === '[object Object]' && error && typeof error === 'object') {
      const maybeMessage = (error as { message?: string }).message;
      if (typeof maybeMessage === 'string' && maybeMessage) {
        message = maybeMessage;
      } else {
        try {
          message = JSON.stringify(error);
        } catch {
          message = 'Failed to fetch dashboard statistics';
        }
      }
    }

    logger.error('admin_dashboard.unhandled_error', {
      error: message
    });

    return NextResponse.json(
      { error: message || 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}