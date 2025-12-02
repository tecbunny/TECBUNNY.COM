import { NextRequest, NextResponse } from 'next/server';

import { createClient as createServerClient, createServiceClient } from '../../../../lib/supabase/server';
import { logger } from '../../../../lib/logger';
import { isAtLeast } from '../../../../lib/roles';
import type { UserRole } from '../../../../lib/types';

export const dynamic = 'force-dynamic';

const STALE_STATUSES = ['Pending', 'Awaiting Payment'] as const;
const STALE_PAYMENT_STATUSES = [
  'Awaiting Payment',
  'Payment Confirmation Pending',
  'Pending',
  'Payment Failed',
  'Payment Cancelled'
];
const AUTO_CANCEL_REASON = 'Automatically cancelled after 24 hours without payment confirmation.';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const role = (profile?.role as UserRole | undefined)
      ?? ((user.app_metadata as Record<string, unknown> | undefined)?.role as UserRole | undefined)
      ?? 'customer';

    if (!isAtLeast(role, 'manager')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const serviceClient = createServiceClient();
    const cutoffIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: staleOrders, error: fetchError } = await serviceClient
      .from('orders')
      .select('id')
      .in('status', STALE_STATUSES)
      .lte('created_at', cutoffIso)
      .or(
        STALE_PAYMENT_STATUSES
          .map((status) => `payment_status.eq.${encodeURIComponent(status)}`)
          .concat('payment_status.is.null')
          .join(',')
      );

    if (fetchError) {
      logger.error('orders_auto_cancel_fetch_error', { error: fetchError.message });
      return NextResponse.json({ error: 'Failed to evaluate stale orders' }, { status: 500 });
    }

    if (!staleOrders || staleOrders.length === 0) {
      return NextResponse.json({ success: true, cancelled: 0 });
    }

    const staleIds = staleOrders.map((order) => order.id).filter(Boolean);
    if (staleIds.length === 0) {
      return NextResponse.json({ success: true, cancelled: 0 });
    }

    const nowIso = new Date().toISOString();
    const { error: updateError } = await serviceClient
      .from('orders')
      .update({
        status: 'Cancelled',
        payment_status: 'Payment Cancelled',
        cancellation_reason: AUTO_CANCEL_REASON,
        updated_at: nowIso
      })
      .in('id', staleIds);

    if (updateError) {
      logger.error('orders_auto_cancel_update_error', {
        error: updateError.message,
        staleIds
      });
      return NextResponse.json({ error: 'Failed to cancel stale orders' }, { status: 500 });
    }

    logger.info('orders_auto_cancel_success', { count: staleIds.length });
    return NextResponse.json({ success: true, cancelled: staleIds.length });
  } catch (error) {
    logger.error('orders_auto_cancel_unhandled', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
