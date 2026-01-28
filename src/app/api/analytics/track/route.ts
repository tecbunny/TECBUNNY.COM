import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabasePublicConfigured } from '../../../../lib/supabase/server';
import { logger } from '../../../../lib/logger';

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-VCCMTMSVP4';
const GA_API_SECRET = process.env.GA_API_SECRET;
const GA_ENDPOINT = 'https://www.google-analytics.com/mp/collect';

function isFetchFailure(err: unknown) {
  if (!err || typeof err !== 'object') return false;
  const message = String((err as { message?: string }).message || '').toLowerCase();
  return message.includes('fetch failed');
}

function parseGaClientId(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)_ga=([^;]+)/);
  if (!match) return null;
  const value = decodeURIComponent(match[1]);
  const parts = value.split('.');
  if (parts.length < 4) return null;
  return `${parts[2]}.${parts[3]}`;
}

function getClientId(request: NextRequest, sessionId?: string | null) {
  if (sessionId) return sessionId;
  const cookieClientId = parseGaClientId(request.headers.get('cookie'));
  if (cookieClientId) return cookieClientId;
  if (typeof crypto?.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}.${Math.floor(Math.random() * 1e9)}`;
}

async function sendGaEvent(params: {
  clientId: string;
  userId?: string | null;
  eventType: string;
  pageUrl?: string | null;
  resourceId?: string | null;
  sessionId?: string | null;
}) {
  if (!GA_API_SECRET) {
    return;
  }

  const eventParams: Record<string, unknown> = {
    page_location: params.pageUrl ?? undefined,
    resource_id: params.resourceId ?? undefined,
    session_id: params.sessionId ?? undefined,
  };

  const payload = {
    client_id: params.clientId,
    user_id: params.userId ?? undefined,
    events: [
      {
        name: params.eventType,
        params: eventParams,
      },
    ],
  };

  const response = await fetch(
    `${GA_ENDPOINT}?measurement_id=${MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    logger.warn('ga.measurement_protocol.failed', { status: response.status, body: text });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, pageUrl, resourceId, metadata, sessionId } = body;

    const clientId = getClientId(request, sessionId);
    let userId: string | null = null;

    if (isSupabasePublicConfigured) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;

      const { error } = await supabase
        .from('analytics_events')
        .insert({
          event_type: eventType,
          page_url: pageUrl,
          resource_id: resourceId,
          metadata,
          session_id: sessionId,
          user_id: user?.id || null,
        });

      // Auto-generate leads for inquiries
      if ((eventType === 'amc_inquiry' || eventType === 'installation_inquiry') && user) {
        const leadType = eventType === 'amc_inquiry' ? 'amc' : 'installation';
        
        // Fetch user details if possible, or just store the user_id
        // For now, we rely on the user_id foreign key to link to the user profile
        await supabase.from('leads').insert({
          user_id: user.id,
          type: leadType,
          product_id: resourceId,
          status: 'new',
          customer_email: user.email,
        });
      }

      if (error) {
        if (isFetchFailure(error) || process.env.NODE_ENV !== 'production') {
          logger.warn('Failed to track analytics event', { error });
        } else {
          logger.error('Failed to track analytics event', { error });
          return NextResponse.json({ error: 'Tracking failed' }, { status: 500 });
        }
      }
    }

    await sendGaEvent({
      clientId,
      userId,
      eventType,
      pageUrl,
      resourceId,
      sessionId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isFetchFailure(error) || process.env.NODE_ENV !== 'production') {
      logger.warn('Analytics API Error', { error });
      return NextResponse.json({ success: true, skipped: 'Analytics unavailable' });
    }
    logger.error('Analytics API Error', { error });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
