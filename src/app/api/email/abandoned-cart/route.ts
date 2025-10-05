import { NextRequest, NextResponse } from 'next/server';

import { emailHelpers } from '../../../../lib/email';
import { rateLimit } from '../../../../lib/rate-limit';
import { createClient as createServerClient } from '../../../../lib/supabase/server';

// Abandoned cart reminders: 3 per 12h per user/IP
const LIMIT = 3;
const WINDOW_MS = 12 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, userName, cartItems, restoreCartUrl, discountCode, minutesSinceAbandoned } = body || {};
    if (typeof to !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      return NextResponse.json({ error: 'Invalid recipient email' }, { status: 400 });
    }
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json({ error: 'cartItems must be a non-empty array' }, { status: 400 });
    }
    let userId: string | null = null;
    try {
      const supabase = await createServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch(_) {}
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateKey = userId ? `user:${userId}` : `ip:${ip}`;
    if (!rateLimit(rateKey, 'email_abandoned_cart', { limit: LIMIT, windowMs: WINDOW_MS })) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    const success = await emailHelpers.sendAbandonedCartReminder(to, {
      userName,
      cartItems,
      restoreCartUrl,
      discountCode,
      minutesSinceAbandoned
    });
    const res = success
      ? NextResponse.json({ success: true, message: 'Abandoned cart email sent' })
      : NextResponse.json({ error: 'Failed to send abandoned cart email' }, { status: 500 });
    res.headers.set('Cache-Control', 'no-store');
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('Referrer-Policy', 'same-origin');
    return res;
  } catch (error) {
    console.error('Abandoned cart email API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}