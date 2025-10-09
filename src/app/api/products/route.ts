import { NextRequest, NextResponse } from 'next/server';

import { createClient, createServiceClient, isSupabaseServiceConfigured } from '../../../lib/supabase/server';
import { getSessionWithRole } from '../../../lib/auth/server-role';
import { logger } from '../../../lib/logger';

// Simple in-memory cache for products table columns (lifetime of lambda)
let productColumnsCache: Set<string> | null = null;
async function ensureProductColumns(supabase: any) {
  if (productColumnsCache) return productColumnsCache;
  try {
    const { data } = await supabase
      .from('information_schema.columns' as any)
      .select('column_name')
      .eq('table_name', 'products');
    productColumnsCache = new Set((data || []).map((c: any) => c.column_name));
    logger.debug('product_columns_cached', { columns: Array.from(productColumnsCache) });
  } catch (e) {
    logger.warn('product_columns_cache_failed', { error: (e as Error).message });
    productColumnsCache = new Set();
  }
  return productColumnsCache;
}

const ADMIN_ROLES = new Set(['admin', 'superadmin', 'manager']);

// Get products with variants and options
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const handle = searchParams.get('handle');
    const include_variants = searchParams.get('include_variants') === 'true';
    const include_options = searchParams.get('include_options') === 'true';

    const { supabase: authClient, role } = await getSessionWithRole(request);
    const supabase = role && ADMIN_ROLES.has(role) && isSupabaseServiceConfigured
      ? createServiceClient()
      : authClient ?? await createClient();

    if (handle) {
      // Get specific product by handle (use name as fallback)
      let product: any = null;
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .or(`handle.eq.${handle},name.ilike.%${handle}%`)
          .single();
        if (error) throw error;
        product = data;
  } catch (_error: any) {
        // Fallback: check which columns exist and try appropriate fallback
        const columns = await ensureProductColumns(supabase);
        let fallbackQuery = supabase.from('products').select('*');
        
        if (columns.has('title')) {
          fallbackQuery = fallbackQuery.ilike('title', `%${handle}%`);
        } else if (columns.has('name')) {
          fallbackQuery = fallbackQuery.ilike('name', `%${handle}%`);
        } else {
          // Last resort: search by description
          fallbackQuery = fallbackQuery.ilike('description', `%${handle}%`);
        }
        
        const { data: list } = await fallbackQuery.limit(1);
        if (!list || list.length === 0) {
          return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }
        product = list[0];
      }

      // Get variants if requested (skip if table doesn't exist)
      if (include_variants) {
        try {
          const { data: variants } = await supabase
            .from('product_variants')
            .select('*')
            .eq('product_id', product.id)
            .order('position');
          
          product.variants = variants || [];
        } catch (_error) {
          logger.info('products.variants_table_not_available', { productId: product.id });
          product.variants = [];
        }
      }

      // Get options if requested (skip if table doesn't exist)
      if (include_options) {
        try {
          const { data: options } = await supabase
            .from('product_options')
            .select('*')
            .eq('product_id', product.id)
            .order('position');
          
          product.options = options || [];
        } catch (_error) {
          logger.info('products.options_table_not_available', { productId: product.id });
          product.options = [];
        }
      }

      return NextResponse.json({
        success: true,
        data: product
      });
  } else {
      // Get all products with pagination
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const offset = (page - 1) * limit;

      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      // Add filters
      const status = searchParams.get('status');
      if (status) {
        query = query.eq('status', status);
      }

      const vendor = searchParams.get('vendor');
      if (vendor) {
        query = query.eq('vendor', vendor);
      }

      const search = searchParams.get('search');
      if (search) {
        // Check which columns exist and use appropriate search
        const columns = await ensureProductColumns(supabase);
        if (columns.has('title')) {
          query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
        } else if (columns.has('name')) {
          query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
        } else {
          // Fallback to description only if neither title nor name exist
          query = query.ilike('description', `%${search}%`);
        }
      }

      const { data: products, error, count } = await query;

      if (error) {
        logger.error('products.fetch_failed', { error });
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
      }
      // Optionally load options / variants in bulk if requested
      const warnings: string[] = [];
      if (products && products.length) {
        const productIds = products.map(p => p.id).filter(Boolean);
        if (include_options && productIds.length) {
          try {
            const { data: opts } = await supabase
              .from('product_options')
              .select('*')
              .in('product_id', productIds)
              .order('position');
            if (opts) {
              const grouped: Record<string, any[]> = {};
              opts.forEach(o => {
                (grouped[o.product_id] = grouped[o.product_id] || []).push(o);
              });
              products.forEach(p => { (p as any).options = grouped[p.id] || []; });
            }
          } catch (_error: any) {
            warnings.push('product_options table missing; options skipped');
          }
        }
        if (include_variants && productIds.length) {
          try {
            const { data: vars } = await supabase
              .from('product_variants')
              .select('*')
              .in('product_id', productIds)
              .order('position');
            if (vars) {
              const grouped: Record<string, any[]> = {};
              vars.forEach(v => {
                (grouped[v.product_id] = grouped[v.product_id] || []).push(v);
              });
              products.forEach(p => { (p as any).variants = grouped[p.id] || []; });
            }
          } catch (_error: any) {
            warnings.push('product_variants table missing; variants skipped');
          }
        }
      }

      return NextResponse.json({
        success: true,
        data: products,
        pagination: {
          page,
          limit,
          total: count || 0,
          pages: Math.ceil((count || 0) / limit)
        },
        warnings: warnings.length ? warnings : undefined
      });
    }
  } catch (error) {
    logger.error('products.api_error', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create or update product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      handle, 
      title, 
      description, 
      vendor, 
      product_type, 
      tags, 
      status, 
      images, 
      seo_title, 
      seo_description,
      options,
      variants
    } = body;

    // Normalize images to an array of URL strings (supports legacy object shape {url})
    const normalizedImages = Array.isArray(images)
      ? images.map((img: any) => typeof img === 'string' ? img : img?.url).filter(Boolean)
      : [];

    const { supabase: authClient, session, role } = await getSessionWithRole(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!role || !ADMIN_ROLES.has(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = role && ADMIN_ROLES.has(role) && isSupabaseServiceConfigured
      ? createServiceClient()
      : authClient;
    const user = session.user;

    // Create product; now that handle is available, prefer upsert on handle, with safe fallback
    let product: any = null;
    const basePayload: any = {
      handle,
      title,
      description,
      vendor,
      product_type,
      tags,
      status: status || 'active',
	images: normalizedImages,
      seo_title,
      seo_description,
      created_by: user.id,
      updated_by: user.id
    };
    // Remove tags if column absent
    const cols = await ensureProductColumns(supabase);
    const postWarnings: string[] = [];
  if (!cols.has('tags')) { delete basePayload.tags; postWarnings.push('tags column missing; tags ignored'); }
  if (!cols.has('created_by')) { delete basePayload.created_by; postWarnings.push('created_by column missing; ignored'); }
  if (!cols.has('updated_by')) { delete basePayload.updated_by; postWarnings.push('updated_by column missing; ignored'); }
    // Try upsert on handle
  const up = await supabase
      .from('products')
      .upsert(basePayload, { onConflict: 'handle' })
      .select()
      .single();
  if (!up.error && up.data) {
      product = up.data;
    } else {
      // Fallback: insert without handle
      const fallbackPayload = { ...basePayload };
      delete (fallbackPayload as any).handle;
  const ins = await supabase
        .from('products')
        .insert(fallbackPayload)
        .select()
        .single();
      if (ins.error) {
        logger.error('products.create_failed', { error: up.error || ins.error });
        return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
      }
      product = ins.data;
    }

    // Create options if provided
    if (options && options.length > 0) {
      // Delete existing options
      await supabase
        .from('product_options')
        .delete()
        .eq('product_id', product.id);

      // Insert new options
      const optionsData = options.map((option: any, index: number) => ({
        product_id: product.id,
        name: option.name,
        values: option.values,
        position: index + 1
      }));

      const { error: optionsError } = await supabase
        .from('product_options')
        .insert(optionsData);

      if (optionsError) {
        logger.error('products.create_options_failed', { error: optionsError });
      }
    }

    // Create variants if provided
    if (variants && variants.length > 0) {
      // Delete existing variants
      await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', product.id);

      // Insert new variants
      const variantsData = variants.map((variant: any, index: number) => ({
        product_id: product.id,
        title: variant.title,
        sku: variant.sku,
        barcode: variant.barcode,
        price: variant.price || 0,
        compare_at_price: variant.compare_at_price,
        cost_per_item: variant.cost_per_item,
        weight: variant.weight,
        inventory_quantity: variant.inventory_quantity || 0,
        option1: variant.option1,
        option2: variant.option2,
        option3: variant.option3,
        position: index + 1,
        status: 'active'
      }));

      const { error: variantsError } = await supabase
        .from('product_variants')
        .insert(variantsData);

      if (variantsError) {
        logger.error('products.create_variants_failed', { error: variantsError });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Product created successfully',
      data: product,
      warnings: postWarnings.length ? postWarnings : undefined
    });

  } catch (error) {
    logger.error('products.create_api_error', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update product
export async function PUT(request: NextRequest) {
  const correlationId = request.headers.get('x-correlation-id') || crypto.randomUUID();
  try {
    const body = await request.json();
    const { id, options, variants, handle: _ignoreHandle, images, image, additional_images, ...updateData } = body;

    if (!id) {
      logger.warn('product_update_missing_id', { correlationId });
      return NextResponse.json({ error: 'Product id is required' }, { status: 400, headers: { 'x-correlation-id': correlationId } });
    }

    // Handle image fields from frontend
    if (image !== undefined) {
      (updateData as any).image = image;
    }
    if (additional_images !== undefined) {
      (updateData as any).additional_images = additional_images;
    }

    // Normalize images if passed (array of URLs or objects) - legacy support
    if (Array.isArray(images)) {
      (updateData as any).images = images.map((img: any) => typeof img === 'string' ? img : img?.url).filter(Boolean);
    }

    const { supabase: authClient, session, role } = await getSessionWithRole(request);
    if (!session) {
      logger.warn('product_update_unauthenticated', { correlationId });
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: { 'x-correlation-id': correlationId } });
    }
    if (!role || !ADMIN_ROLES.has(role)) {
      logger.warn('product_update_forbidden', { correlationId, role });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: { 'x-correlation-id': correlationId } });
    }

    const supabase = role && ADMIN_ROLES.has(role) && isSupabaseServiceConfigured
      ? createServiceClient()
      : authClient;
    const user = session.user;

    // Normalize tags if provided as comma separated string
    if (typeof (updateData as any).tags === 'string') {
      (updateData as any).tags = (updateData as any).tags
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean);
    }
    const updateCols = await ensureProductColumns(supabase);
    const putWarnings: string[] = [];
    if (!updateCols.has('tags')) {
      delete (updateData as any).tags;
      putWarnings.push('tags column missing; tags ignored');
    }

    // Remove undefined keys to avoid PostgREST rejecting explicit undefined
    Object.keys(updateData).forEach(k => (updateData as any)[k] === undefined && delete (updateData as any)[k]);

  logger.debug('product_update_payload', { correlationId, id, keys: Object.keys(updateData), imagesCount: (updateData as any).images?.length, tagsType: typeof (updateData as any).tags });

    const updateFields: any = { ...updateData };
    if (updateCols.has('updated_by')) updateFields.updated_by = user.id;
    if (updateCols.has('updated_at')) updateFields.updated_at = new Date().toISOString();

    const { data: product, error } = await supabase
      .from('products')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('product_update_failed', { correlationId, code: (error as any).code, message: error.message, details: error.details });
      const debug = request.nextUrl.searchParams.get('debug') === '1';
      let schema: any = undefined;
      if (debug) {
        try {
          const { data: columns } = await supabase
            .from('information_schema.columns' as any)
            .select('column_name,data_type,is_nullable')
            .eq('table_name', 'products');
          schema = columns?.filter((c: any) => ['images','tags','title','handle','status'].includes(c.column_name));
        } catch (e) {
          schema = { error: (e as Error).message };
        }
      }
      return NextResponse.json({ 
        error: 'Failed to update product', 
        error_code: (error as any).code || undefined,
        hint: (!process.env.NODE_ENV || process.env.NODE_ENV === 'development' || debug) ? error.message : undefined,
        schema,
        correlationId
      }, { status: 500, headers: { 'x-correlation-id': correlationId } });
    }

    // Update options if provided
    if (Array.isArray(options)) {
      try {
        await supabase.from('product_options').delete().eq('product_id', id);
        if (options.length > 0) {
          const optionsData = options.map((option: any, index: number) => ({
            product_id: id,
            name: option.name,
            values: option.values,
            position: index + 1,
          }));
          const { error: optionsError } = await supabase
            .from('product_options')
            .insert(optionsData);
          if (optionsError) {
            logger.error('products.update_options_failed', { error: optionsError });
          }
        }
      } catch (e) {
        logger.info('products.options_update_table_missing', { productId: id, error: e });
      }
    }

    // Update variants if provided
    if (Array.isArray(variants)) {
      try {
        await supabase.from('product_variants').delete().eq('product_id', id);
        if (variants.length > 0) {
          const variantsData = variants.map((variant: any, index: number) => ({
            product_id: id,
            title: variant.title,
            sku: variant.sku,
            barcode: variant.barcode,
            price: variant.price || 0,
            compare_at_price: variant.compare_at_price,
            cost_per_item: variant.cost_per_item,
            weight: variant.weight,
            inventory_quantity: variant.inventory_quantity || 0,
            option1: variant.option1,
            option2: variant.option2,
            option3: variant.option3,
            position: index + 1,
            status: variant.status || 'active',
          }));
          const { error: variantsError } = await supabase
            .from('product_variants')
            .insert(variantsData);
          if (variantsError) {
            logger.error('products.update_variants_failed', { error: variantsError });
          }
        }
      } catch (e) {
        logger.info('products.variants_update_table_missing', { productId: id, error: e });
      }
    }

    logger.info('product_update_success', { correlationId, id, warnings: putWarnings });
    return NextResponse.json({
      success: true,
      message: 'Product updated successfully',
      data: product,
      correlationId,
      warnings: putWarnings.length ? putWarnings : undefined
    }, { headers: { 'x-correlation-id': correlationId } });

  } catch (error) {
    logger.error('product_update_unhandled', { correlationId, err: (error as Error).message, stack: (error as Error).stack });
    return NextResponse.json({ error: 'Internal server error', correlationId }, { status: 500, headers: { 'x-correlation-id': correlationId } });
  }
}

// Delete product
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const { supabase: authClient, session, role } = await getSessionWithRole(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!role || !ADMIN_ROLES.has(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = role && ADMIN_ROLES.has(role) && isSupabaseServiceConfigured
      ? createServiceClient()
      : authClient ?? await createClient();

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('products.delete_failed', { error });
      return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    logger.error('products.delete_api_error', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}