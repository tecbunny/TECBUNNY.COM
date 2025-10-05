import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { logger } from '../../../lib/logger';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Use service role if available, else anon for read operations (GET)
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

function isUndefinedColumn(err: any) {
  if (!err) return false;
  const code = String(err.code || '');
  const combined = `${err.message || ''} ${err.hint || ''} ${err.details || ''}`.toLowerCase();
  return (
    code === '42703' ||
    /^pgrst\d+$/i.test(code) && (
      combined.includes('schema cache') ||
      combined.includes('could not find') ||
      combined.includes('does not exist') ||
      combined.includes('unknown column')
    ) ||
    /column .* does not exist/i.test(combined)
  );
}

function normalizePage(row: any | null) {
  if (!row) return null;
  const page_key = row.page_key ?? row.key ?? null;
  const status = row.status ?? (row.is_active === true ? 'published' : row.is_active === false ? 'draft' : undefined);
  return { ...row, page_key, status };
}

async function getPageByKey(pageKey: string, supabase: any) {
  // Try a sequence of strategies to accommodate different schemas
  const tries: Array<() => PromiseLike<any>> = [
    // Modern: page_key + status
    () => supabase.from('page_content').select('*').eq('page_key', pageKey).eq('status', 'published').maybeSingle(),
    // Mixed: key + status
    () => supabase.from('page_content').select('*').eq('key', pageKey).eq('status', 'published').maybeSingle(),
    // Legacy: key + is_active
    () => supabase.from('page_content').select('*').eq('key', pageKey).eq('is_active', true).maybeSingle(),
    // Minimal: page_key only
    () => supabase.from('page_content').select('*').eq('page_key', pageKey).maybeSingle(),
    // Minimal legacy: key only
    () => supabase.from('page_content').select('*').eq('key', pageKey).maybeSingle(),
  ];

  for (const run of tries) {
    const { data, error } = await run();
    if (!error) return { data, error: null };
    if (isUndefinedColumn(error)) {
      continue;
    }
    // Non-undefined-column error: stop and surface it
    return { data: null, error };
  }
  // Only undefined-column errors encountered: treat as not found (no 500)
  return { data: null, error: null };
}

// Get page content by key
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const pageKey = searchParams.get('key');

    if (!pageKey) {
      return NextResponse.json({ error: 'Page key is required' }, { status: 400 });
    }
    const { data: pageContent, error } = await getPageByKey(pageKey, supabase);

    if (error) {
  logger.error('page_content_fetch_failed', { error });
      return NextResponse.json({ error: 'Failed to fetch page content' }, { status: 500 });
    }

    // Return 200 with null data when not found; normalize field names
    return NextResponse.json({ success: true, data: normalizePage(pageContent ?? null) });

  } catch (error) {
  logger.error('page_content_api_error', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update page content (admin only)
export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { page_key, key, title, content, meta_description, _seo, status, _is_active } = await request.json();
    const pageKey = page_key || key;
    
    if (!pageKey || !title || !content) {
      return NextResponse.json({ 
        error: 'Page key, title, and content are required' 
      }, { status: 400 });
    }

    // Update or insert page content (try modern schema first)
    const payloadModern: any = {
      page_key: pageKey,
      title,
      content: typeof content === 'string' ? JSON.parse(content) : content,
      meta_description: meta_description || null,
      meta_keywords: null,
      status: status || 'published',
      updated_at: new Date().toISOString()
    };

    let upsert = await supabase
      .from('page_content')
      .upsert(payloadModern, { onConflict: 'page_key' })
      .select()
      .single();

    // Fallback to legacy schema if columns don’t exist
    if (upsert.error && isUndefinedColumn(upsert.error)) {
      // Legacy without status
      const payloadLegacy: any = {
        key: pageKey,
        title,
        content: typeof content === 'string' ? JSON.parse(content) : content,
        meta_description: meta_description || null,
        updated_at: new Date().toISOString()
      };
      upsert = await supabase
        .from('page_content')
        .upsert(payloadLegacy, { onConflict: 'key' })
        .select()
        .maybeSingle();

      // If even that fails due to missing columns (e.g., meta_description), try a minimal payload
      if (upsert.error && isUndefinedColumn(upsert.error)) {
        const payloadMinimal: any = {
          key: pageKey,
          title,
          content: typeof content === 'string' ? JSON.parse(content) : content,
          updated_at: new Date().toISOString()
        };
        upsert = await supabase
          .from('page_content')
          .upsert(payloadMinimal, { onConflict: 'key' })
          .select()
          .maybeSingle();
      }
    }

    if (upsert.error) {
      logger.error('page_content_update_failed', { error: upsert.error });
      return NextResponse.json({ error: 'Failed to update page content' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Page content updated successfully',
      data: normalizePage(upsert.data)
    });

  } catch (error) {
    logger.error('page_content_update_exception', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get all page contents (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { action } = await request.json();

    if (action !== 'list_all') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get all page contents, try modern order then legacy
    let { data: pages, error } = await supabase
      .from('page_content')
      .select('*')
      .order('page_key');

    if (error && isUndefinedColumn(error)) {
      const fallback = await supabase
        .from('page_content')
        .select('*')
        .order('key');
      pages = fallback.data || [];
      error = fallback.error;

      if (error && isUndefinedColumn(error)) {
        // Final fallback: no order
        const noOrder = await supabase
          .from('page_content')
          .select('*');
        pages = noOrder.data || [];
        error = noOrder.error;
      }
    }

    if (error) {
      logger.error('page_content_list_failed', { error });
      return NextResponse.json({ error: 'Failed to fetch page contents' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: (pages || []).map(normalizePage)
    });

  } catch (error) {
    logger.error('page_content_list_exception', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}