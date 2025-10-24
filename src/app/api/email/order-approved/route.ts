import { NextRequest, NextResponse } from 'next/server';

import { emailHelpers } from '../../../../lib/email';
import { rateLimit } from '../../../../lib/rate-limit';

const LIMIT = 5;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const { to, orderId, orderTotal, orderType, customerName } = await request.json();

    if (!to || (typeof to !== 'string' && !Array.isArray(to))) {
      return NextResponse.json({ error: 'Invalid recipient email' }, { status: 400 });
    }

    const recipients = Array.isArray(to) ? to : [to];
    const validRecipients = recipients
      .filter((email) => typeof email === 'string')
      .map((email) => email.trim())
      .filter((email) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email));

    if (validRecipients.length === 0) {
      return NextResponse.json({ error: 'No valid recipient emails provided' }, { status: 400 });
    }

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'Invalid orderId' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateKey = `order-approved:${ip}`;
    if (!rateLimit(rateKey, 'email_order_approved', { limit: LIMIT, windowMs: WINDOW_MS })) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const normalizedOrderType = typeof orderType === 'string'
      ? (['pickup', 'delivery'].includes(orderType.toLowerCase())
          ? (orderType.toLowerCase() as 'pickup' | 'delivery')
          : undefined)
      : undefined;

    const success = await emailHelpers.notifyAdminOrderApproved(validRecipients, {
      orderId,
      orderTotal: typeof orderTotal === 'number' ? orderTotal : undefined,
      orderType: normalizedOrderType,
      userName: typeof customerName === 'string' && customerName.trim() ? customerName.trim() : undefined,
    });

    if (!success) {
      return NextResponse.json({ error: 'Failed to send approval email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Approval email sent' });
  } catch (error) {
    console.error('Order approval email API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
