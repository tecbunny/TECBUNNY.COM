import { NextRequest, NextResponse } from 'next/server';

import { logger } from '../../../lib/logger';

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-VCCMTMSVP4';
const API_SECRET = process.env.GA_API_SECRET;

const GA_ENDPOINT = 'https://www.google-analytics.com/mp/collect';

function parseGaClientId(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)_ga=([^;]+)/);
  if (!match) return null;
  const value = decodeURIComponent(match[1]);
  const parts = value.split('.');
  if (parts.length < 4) return null;
  return `${parts[2]}.${parts[3]}`;
}

function getClientId(request: NextRequest, bodyClientId?: string | null) {
  if (bodyClientId) return bodyClientId;
  const cookieClientId = parseGaClientId(request.headers.get('cookie'));
  if (cookieClientId) return cookieClientId;
  if (typeof crypto?.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}.${Math.floor(Math.random() * 1e9)}`;
}

export async function POST(request: NextRequest) {
  try {
    if (!API_SECRET) {
      return NextResponse.json({ error: 'GA API secret missing' }, { status: 500 });
    }

    const payload = await request.json();
    const events = Array.isArray(payload?.events) ? payload.events : [];

    if (!events.length) {
      return NextResponse.json({ error: 'No events provided' }, { status: 400 });
    }

    const clientId = getClientId(request, payload?.client_id ?? null);
    const gaPayload = {
      client_id: clientId,
      user_id: payload?.user_id ?? undefined,
      events,
    };

    const response = await fetch(`${GA_ENDPOINT}?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(gaPayload),
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error('ga.measurement_protocol.failed', {
        status: response.status,
        body: text,
      });
      return NextResponse.json({ error: 'GA request failed' }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('ga.measurement_protocol.error', { error });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
