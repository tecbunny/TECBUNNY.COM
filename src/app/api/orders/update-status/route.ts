import { NextRequest, NextResponse } from 'next/server';

import { createClient as createServerClient, createServiceClient } from '../../../../lib/supabase/server';
import { logger } from '../../../../lib/logger';
import { isAtLeast } from '../../../../lib/roles';
import type { OrderStatus, UserRole } from '../../../../lib/types';

const STATUS_NORMALIZATION: Record<string, OrderStatus> = {
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
  rejected: 'Rejected',
};

const PICKUP_TYPE_SET = new Set(['pickup', 'walk-in', 'walkin', 'walk in', 'walk_in']);

const ALLOWED_MUTABLE_FIELDS = new Set([
  'cancellation_reason',
  'payment_reference',
  'notes',
  'shipping_amount',
  'discount_amount',
]);

interface UpdateStatusPayload {
  orderId?: unknown;
  status?: unknown;
  additionalData?: unknown;
}

function normalizeStatus(value: unknown): OrderStatus | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  const key = value.trim().toLowerCase();
  return STATUS_NORMALIZATION[key] ?? (value as OrderStatus);
}

function sanitizeAdditionalData(raw: unknown) {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!ALLOWED_MUTABLE_FIELDS.has(key)) continue;

    if (key === 'cancellation_reason' || key === 'notes' || key === 'payment_reference') {
      if (typeof val === 'string' && val.trim()) {
        result[key] = val.trim();
      }
      continue;
    }

    if (key === 'shipping_amount' || key === 'discount_amount') {
      const numeric = typeof val === 'number' ? val : Number(val);
      if (Number.isFinite(numeric)) {
        result[key] = Math.round(numeric * 100) / 100;
      }
      continue;
    }
  }
  return result;
}

function resolvePaymentStatusUpdate(order: { payment_status?: string | null; payment_method?: string | null }, newStatus: OrderStatus) {
  const method = (order.payment_method ?? '').toLowerCase();
  switch (newStatus) {
    case 'Awaiting Payment':
      return { payment_status: 'Payment Confirmation Pending' };
    case 'Payment Confirmed':
      return { payment_status: 'Payment Confirmed' };
    case 'Confirmed':
      if (method === 'cod') return {};
      if ((order.payment_status ?? '').toLowerCase() === 'payment confirmed') return {};
      return { payment_status: 'Payment Confirmed' };
    case 'Processing':
    case 'Ready to Ship':
    case 'Ready for Pickup':
    case 'Shipped':
    case 'Completed':
    case 'Delivered':
      if (method === 'cod') return {};
      return { payment_status: 'Payment Confirmed' };
    case 'Cancelled':
    case 'Rejected':
      return { payment_status: 'Payment Cancelled' };
    default:
      return {};
  }
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json().catch(() => ({}))) as UpdateStatusPayload;
    const orderIdRaw = payload?.orderId;
    const statusRaw = payload?.status;
    const additionalRaw = payload?.additionalData;

    if (typeof orderIdRaw !== 'string' || !orderIdRaw.trim()) {
      return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 });
    }

    const normalizedStatus = normalizeStatus(statusRaw);
    if (!normalizedStatus) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const orderId = orderIdRaw.trim();

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const role = (profile?.role as UserRole | undefined)
      ?? ((user.app_metadata as Record<string, unknown> | undefined)?.role as UserRole | undefined)
      ?? 'customer';

    const serviceClient = createServiceClient();
    const { data: orderRecord, error: fetchError } = await serviceClient
      .from('orders')
      .select('id, type, payment_status, payment_method, status')
      .eq('id', orderId)
      .maybeSingle();

    if (fetchError) {
      logger.error('order_update_status_fetch_error', { error: fetchError.message, orderId });
      return NextResponse.json({ error: 'Failed to load order' }, { status: 500 });
    }

    if (!orderRecord) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const typeKey = (orderRecord.type ?? '').toString().trim().toLowerCase();
    const needsPickupRole = PICKUP_TYPE_SET.has(typeKey);
    const requiredRole: UserRole = needsPickupRole ? 'sales' : 'manager';

    if (!isAtLeast(role, requiredRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updatePayload: Record<string, unknown> = {
      status: normalizedStatus,
      processed_by: user.id,
      updated_at: new Date().toISOString(),
      ...resolvePaymentStatusUpdate(orderRecord, normalizedStatus),
      ...sanitizeAdditionalData(additionalRaw),
    };

    if (normalizedStatus === 'Cancelled' || normalizedStatus === 'Rejected') {
      if (typeof updatePayload.cancellation_reason !== 'string' || !updatePayload.cancellation_reason) {
        updatePayload.cancellation_reason = 'Cancelled via admin portal';
      }
    }

    const { error: updateError } = await serviceClient
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId);

    if (updateError) {
      logger.error('order_update_status_failed', {
        error: updateError.message,
        orderId,
        status: normalizedStatus,
      });
      return NextResponse.json({ error: updateError.message || 'Failed to update order' }, { status: 500 });
    }

    logger.info('order_update_status_success', {
      orderId,
      status: normalizedStatus,
      by: user.id,
    });

    return NextResponse.json({ success: true, orderId, status: normalizedStatus });
  } catch (error) {
    logger.error('order_update_status_unhandled', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
