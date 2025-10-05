import { NextRequest, NextResponse } from 'next/server';

import { emailHelpers } from '../../../../lib/email';
import { rateLimit } from '../../../../lib/rate-limit';
import { createClient as createServerClient } from '../../../../lib/supabase/server';

const LIMIT = 10; // higher allowance for internal notifications
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const { to, orderId } = await request.json();
    if (typeof to !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      return NextResponse.json({ error: 'Invalid recipient email' }, { status: 400 });
    }
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }
    let userId: string | null = null;
    try {
      const supabase = await createServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch(_) {}
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateKey = userId ? `user:${userId}` : `ip:${ip}`;
    if (!rateLimit(rateKey, 'email_notify_sales_pickup', { limit: LIMIT, windowMs: WINDOW_MS })) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    const success = await emailHelpers.notifySalesPickupOrder(to, { orderId, orderType: 'pickup' });
    const res = success
      ? NextResponse.json({ success: true, message: 'Sales pickup notification sent' })
      : NextResponse.json({ error: 'Failed to send sales pickup notification' }, { status: 500 });
    res.headers.set('Cache-Control', 'no-store');
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('Referrer-Policy', 'same-origin');
    return res;
  } catch (error) {
    console.error('Sales pickup notification email API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}