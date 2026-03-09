import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const fallbackUrl = new URL('/favicon.ico', request.url).toString();

  try {
    const supabase = await createClient();

    // Get favicon URL from settings
    const { data: faviconSetting, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'faviconUrl')
      .single();

    if (error || !faviconSetting?.value) {
      return NextResponse.redirect(fallbackUrl);
    }

    // Fetch the favicon from storage
    const faviconResponse = await fetch(faviconSetting.value);

    if (!faviconResponse.ok) {
      return NextResponse.redirect(fallbackUrl);
    }

    return new NextResponse(faviconResponse.body, {
      headers: {
        'Content-Type': faviconResponse.headers.get('Content-Type') || 'image/x-icon',
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    console.error('Error serving dynamic favicon:', error);
    return NextResponse.redirect(fallbackUrl);
  }
}
