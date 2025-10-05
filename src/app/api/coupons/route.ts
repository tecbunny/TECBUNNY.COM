import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import { createClient as createServerClient, isSupabasePublicConfigured, isSupabaseServiceConfigured } from '../../../lib/supabase/server';
import { logger } from '../../../lib/logger';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-placeholder';

function getSupabaseAdmin() {
  return createAdminClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// Simple in-memory rate limiter for mutations (per instance)
const couponRate = new Map<string, { count: number; first: number }>()
const WINDOW_MS = 60_000
const LIMIT = 20
function rateLimit(key: string) {
  const now = Date.now()
  const rec = couponRate.get(key)
  if (!rec) { couponRate.set(key, { count: 1, first: now }); return true }
  if (now - rec.first > WINDOW_MS) { couponRate.set(key, { count: 1, first: now }); return true }
  if (rec.count >= LIMIT) return false
  rec.count++
  return true
}

async function requireRole(_request: NextRequest) {
  if (!isSupabasePublicConfigured) {
    logger.error('coupons.require-role.missing_supabase_config');
    return {
      error: 'Supabase configuration missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      status: 503
    } as const;
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Authentication required', status: 401 }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || !['admin', 'manager'].includes(profile.role)) return { error: 'Forbidden', status: 403 }
  return { user, role: profile.role }
}

export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseServiceConfigured) {
      logger.error('coupons.get.missing_supabase_config');
      return NextResponse.json(
        {
          error: 'Supabase configuration missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
        },
        { status: 503 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const id = searchParams.get('id')

    if (code) {
      // Get specific coupon by code
      const { data, error } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('status', 'active')
        .single()

      if (error) {
        return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
      }

      // Check if coupon is expired
      if (data.expiry_date && new Date(data.expiry_date) < new Date()) {
        return NextResponse.json({ error: 'Coupon has expired' }, { status: 400 })
      }

      // Check usage limit
      if (data.usage_limit && data.used_count >= data.usage_limit) {
        return NextResponse.json({ error: 'Coupon usage limit exceeded' }, { status: 400 })
      }

      return NextResponse.json(data)
    } else if (id) {
      // Get specific coupon by ID
      const { data, error } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }

      return NextResponse.json(data)
    } else {
      // Get all active coupons
      const { data, error } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    }
  } catch (error) {
    logger.error('coupons_get_error', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseServiceConfigured) {
      logger.error('coupons.post.missing_supabase_config');
      return NextResponse.json(
        {
          error: 'Supabase configuration missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
        },
        { status: 503 }
      );
    }

    const auth = await requireRole(request)
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
    if (!rateLimit(auth.user.id)) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    const body = await request.json()
    const { 
      code, 
      title, 
      description, 
      discount_type, 
      discount_value, 
      minimum_order_amount,
      maximum_discount_amount,
      usage_limit,
      start_date,
      expiry_date,
      status = 'active'
    } = body

    if (!code || !title || !discount_type || !discount_value) {
      return NextResponse.json(
        { error: 'Code, title, discount type, and discount value are required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('coupons')
      .insert({
        code: code.toUpperCase(),
        title,
        description,
        discount_type,
        discount_value: parseFloat(discount_value),
        minimum_order_amount: minimum_order_amount ? parseFloat(minimum_order_amount) : 0,
        maximum_discount_amount: maximum_discount_amount ? parseFloat(maximum_discount_amount) : null,
        usage_limit: usage_limit ? parseInt(usage_limit) : null,
        used_count: 0,
        status,
        start_date: start_date || new Date().toISOString(),
        expiry_date: expiry_date || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    logger.error('coupons_post_error', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isSupabaseServiceConfigured) {
      logger.error('coupons.put.missing_supabase_config');
      return NextResponse.json(
        {
          error: 'Supabase configuration missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
        },
        { status: 503 }
      );
    }

    const auth = await requireRole(request)
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
    if (!rateLimit(auth.user.id)) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    const body = await request.json()
    const { 
      id, 
      code, 
      title, 
      description, 
      discount_type, 
      discount_value, 
      minimum_order_amount,
      maximum_discount_amount,
      usage_limit,
      used_count,
      status,
      start_date,
      expiry_date
    } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      )
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (code !== undefined) updateData.code = code.toUpperCase()
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (discount_type !== undefined) updateData.discount_type = discount_type
    if (discount_value !== undefined) updateData.discount_value = parseFloat(discount_value)
    if (minimum_order_amount !== undefined) updateData.minimum_order_amount = parseFloat(minimum_order_amount)
    if (maximum_discount_amount !== undefined) updateData.maximum_discount_amount = maximum_discount_amount ? parseFloat(maximum_discount_amount) : null
    if (usage_limit !== undefined) updateData.usage_limit = usage_limit ? parseInt(usage_limit) : null
    if (used_count !== undefined) updateData.used_count = parseInt(used_count)
    if (status !== undefined) updateData.status = status
    if (start_date !== undefined) updateData.start_date = start_date
    if (expiry_date !== undefined) updateData.expiry_date = expiry_date

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('coupons')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    logger.error('coupons_put_error', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isSupabaseServiceConfigured) {
      logger.error('coupons.delete.missing_supabase_config');
      return NextResponse.json(
        {
          error: 'Supabase configuration missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
        },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const auth = await requireRole(request)
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
    if (!rateLimit(auth.user.id)) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from('coupons')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('coupons_delete_error', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}