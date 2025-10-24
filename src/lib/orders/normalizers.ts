import type { Order, OrderItem, OrderStatus, OrderType } from '../types';
import { logger } from '../logger';

export const STATUS_MAP: Record<string, OrderStatus> = {
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

type RawItemsPayload = {
  cart_items?: unknown;
  customer_email?: string;
  customer_phone?: string;
  delivery_address?: string;
  pickup_store?: string;
  payment_method?: string;
  customer_notes?: string;
  discount_amount?: unknown;
  shipping_amount?: unknown;
};

function numberFrom(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function parseOrderItemsBlob(rawItems: unknown): RawItemsPayload | null {
  if (!rawItems) {
    return null;
  }

  try {
    if (typeof rawItems === 'string') {
      return JSON.parse(rawItems) as RawItemsPayload;
    }

    if (typeof rawItems === 'object') {
      return rawItems as RawItemsPayload;
    }
  } catch (error) {
    logger.warn('Order normalizer failed to parse order items blob', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return null;
}

export function normalizeOrderStatus(status: string | OrderStatus | null | undefined): OrderStatus {
  if (!status) {
    return 'Pending';
  }

  const normalized = STATUS_MAP[status.toLowerCase()];
  return normalized ?? (status as OrderStatus);
}

export function deserializeOrder(rawOrder: any): Order {
  const itemsPayload = (parseOrderItemsBlob(rawOrder?.items) ?? {}) as RawItemsPayload;

  const parsedItems: OrderItem[] = Array.isArray(rawOrder?.items)
    ? (rawOrder.items as OrderItem[])
    : Array.isArray(itemsPayload.cart_items)
      ? (itemsPayload.cart_items as OrderItem[])
      : [];

  const normalizedStatus = normalizeOrderStatus(rawOrder?.status);
  const normalizedType = (rawOrder?.type ?? rawOrder?.order_type ?? 'Delivery') as OrderType;

  const subtotal = numberFrom(rawOrder?.subtotal ?? rawOrder?.pre_tax_total ?? rawOrder?.total_amount ?? 0);
  const gstAmount = numberFrom(rawOrder?.gst_amount ?? rawOrder?.tax_amount ?? 0);
  const discountAmount = numberFrom(rawOrder?.discount_amount ?? itemsPayload.discount_amount ?? 0);
  const shippingAmount = numberFrom(rawOrder?.shipping_amount ?? itemsPayload.shipping_amount ?? 0);
  const total = numberFrom(
    rawOrder?.total ?? rawOrder?.total_amount ?? subtotal + gstAmount - discountAmount + shippingAmount,
  );

  return {
    ...rawOrder,
    status: normalizedStatus,
    type: normalizedType,
    subtotal,
    gst_amount: gstAmount,
    discount_amount: discountAmount,
    shipping_amount: shippingAmount,
    total,
    items: parsedItems,
    customer_email: itemsPayload.customer_email ?? rawOrder?.customer_email ?? undefined,
    customer_phone: itemsPayload.customer_phone ?? rawOrder?.customer_phone ?? undefined,
    delivery_address: itemsPayload.delivery_address ?? rawOrder?.delivery_address ?? undefined,
    pickup_store: itemsPayload.pickup_store ?? rawOrder?.pickup_store ?? undefined,
    payment_method: itemsPayload.payment_method ?? rawOrder?.payment_method ?? undefined,
    notes: itemsPayload.customer_notes ?? rawOrder?.notes ?? undefined,
  } as Order;
}
