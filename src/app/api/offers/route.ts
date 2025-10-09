import { NextRequest, NextResponse } from 'next/server';

import { createClient, createServiceClient, isSupabaseServiceConfigured } from '../../../lib/supabase/server';
import { getSessionWithRole } from '../../../lib/auth/server-role';

const ADMIN_ROLES = new Set(['admin', 'superadmin', 'manager']);

// GET /api/offers - Fetch offers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    const featuredOnly = searchParams.get('featured') === 'true';
    const homepageOnly = searchParams.get('homepage') === 'true';
    const includeExpired = searchParams.get('include_expired') === 'true';

    const { supabase: authClient, role } = await getSessionWithRole(request);
    const supabase = role && ADMIN_ROLES.has(role) && isSupabaseServiceConfigured
      ? createServiceClient()
      : authClient ?? await createClient();

    let query = supabase
      .from('offers')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    // Apply filters
    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    if (featuredOnly) {
      query = query.eq('is_featured', true);
    }

    if (homepageOnly) {
      query = query.eq('display_on_homepage', true);
    }

    if (!includeExpired) {
      query = query.gte('end_date', new Date().toISOString());
    }

    const { data: offers, error } = await query;

    if (error) {
      console.error('Error fetching offers:', error);
      return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 });
    }

    // Filter out expired offers if not explicitly requested
    let filteredOffers = offers || [];
    if (!includeExpired) {
      const now = new Date();
      filteredOffers = filteredOffers.filter(offer => new Date(offer.end_date) > now);
    }

    return NextResponse.json({ 
      offers: filteredOffers,
      count: filteredOffers.length 
    });

  } catch (error) {
    console.error('Offers API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/offers - Create new offer (Admin only)
export async function POST(request: NextRequest) {
  try {
    const { supabase: authClient, session, role } = await getSessionWithRole(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!role || !ADMIN_ROLES.has(role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const supabase = role && ADMIN_ROLES.has(role) && isSupabaseServiceConfigured
      ? createServiceClient()
      : authClient;

    const offerData = await request.json();

    // Validate required fields
    const requiredFields = ['title', 'discount_type', 'start_date', 'end_date'];
    for (const field of requiredFields) {
      if (!offerData[field]) {
        return NextResponse.json({ 
          error: `Missing required field: ${field}` 
        }, { status: 400 });
      }
    }

    // Validate date range
    const startDate = new Date(offerData.start_date);
    const endDate = new Date(offerData.end_date);
    if (endDate <= startDate) {
      return NextResponse.json({ 
        error: 'End date must be after start date' 
      }, { status: 400 });
    }

    // Check for duplicate offer code if provided
    if (offerData.offer_code) {
      const { data: existingOffer } = await supabase
        .from('offers')
        .select('id')
  .eq('offer_code', offerData.offer_code)
        .single();

      if (existingOffer) {
        return NextResponse.json({ 
          error: 'Offer code already exists' 
        }, { status: 400 });
      }
    }

    // Insert the new offer
    const { data: newOffer, error: insertError } = await supabase
      .from('offers')
  .insert([{ ...offerData, created_by: session.user.id }])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating offer:', insertError);
      return NextResponse.json({ error: 'Failed to create offer' }, { status: 500 });
    }

    return NextResponse.json({ 
      offer: newOffer,
      message: 'Offer created successfully' 
    }, { status: 201 });

  } catch (error) {
    console.error('Create offer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/offers - Update offer (Admin only)
export async function PUT(request: NextRequest) {
  try {
    const { supabase: authClient, session, role } = await getSessionWithRole(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!role || !ADMIN_ROLES.has(role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const supabase = role && ADMIN_ROLES.has(role) && isSupabaseServiceConfigured
      ? createServiceClient()
      : authClient;

    const { id, ...updateData } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Offer ID is required' }, { status: 400 });
    }

    // Validate date range if provided
    if (updateData.start_date && updateData.end_date) {
      const startDate = new Date(updateData.start_date);
      const endDate = new Date(updateData.end_date);
      if (endDate <= startDate) {
        return NextResponse.json({ 
          error: 'End date must be after start date' 
        }, { status: 400 });
      }
    }

    // Check for duplicate offer code if being updated
    if (updateData.offer_code) {
      const { data: existingOffer } = await supabase
        .from('offers')
        .select('id')
        .eq('offer_code', updateData.offer_code)
        .neq('id', id)
        .single();

      if (existingOffer) {
        return NextResponse.json({ 
          error: 'Offer code already exists' 
        }, { status: 400 });
      }
    }

    // Update the offer
    const { data: updatedOffer, error: updateError } = await supabase
      .from('offers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating offer:', updateError);
      return NextResponse.json({ error: 'Failed to update offer' }, { status: 500 });
    }

    if (!updatedOffer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      offer: updatedOffer,
      message: 'Offer updated successfully' 
    });

  } catch (error) {
    console.error('Update offer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/offers - Delete offer (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { supabase: authClient, session, role } = await getSessionWithRole(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!role || !ADMIN_ROLES.has(role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const supabase = role && ADMIN_ROLES.has(role) && isSupabaseServiceConfigured
      ? createServiceClient()
      : authClient;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Offer ID is required' }, { status: 400 });
    }

    // Check if offer has been used
    const { data: usageData } = await supabase
      .from('offer_usage')
      .select('id')
      .eq('offer_id', id)
      .limit(1);

    if (usageData && usageData.length > 0) {
      // Don't delete offers that have been used, just deactivate them
      const { error: deactivateError } = await supabase
        .from('offers')
        .update({ is_active: false })
        .eq('id', id);

      if (deactivateError) {
        console.error('Error deactivating offer:', deactivateError);
        return NextResponse.json({ error: 'Failed to deactivate offer' }, { status: 500 });
      }

      return NextResponse.json({ 
        message: 'Offer has been deactivated (cannot delete used offers)' 
      });
    }

    // Delete the offer if it hasn't been used
    const { error: deleteError } = await supabase
      .from('offers')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting offer:', deleteError);
      return NextResponse.json({ error: 'Failed to delete offer' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Offer deleted successfully' });

  } catch (error) {
    console.error('Delete offer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}