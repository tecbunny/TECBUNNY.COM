import { createClient } from '../supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';

export async function searchOrders(query: string) {
  const supabase = await createClient();
  
  // Try to search by ID if it looks like a UUID
  if (query.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    const { data } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('id', query)
      .single();
    return data ? [data] : [];
  }

  // Otherwise search by customer name or email (if joined) or just return recent orders
  // For simplicity, we'll return recent orders matching a status if the query is a status
  const statuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (statuses.includes(query.toLowerCase())) {
    const { data } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .ilike('status', query)
      .order('created_at', { ascending: false })
      .limit(5);
    return data || [];
  }

  // Default: return recent orders
  const { data } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .order('created_at', { ascending: false })
    .limit(5);
  
  return data || [];
}

export async function updateOrderStatus(orderId: string, status: string) {
  const supabase = await createClient();
  
  // Validate status
  const validStatuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
  const normalizedStatus = validStatuses.find(s => s.toLowerCase() === status.toLowerCase());
  
  if (!normalizedStatus) {
    return { error: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}` };
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ status: normalizedStatus })
    .eq('id', orderId)
    .select()
    .single();

  if (error) return { error: error.message };
  return { success: true, order: data };
}

export async function getAnalytics(metric: 'sales' | 'orders' | 'leads', range: '7d' | '30d' | 'all' = '7d') {
  const supabase = await createClient();
  
  let dateFilter = new Date();
  if (range === '7d') dateFilter.setDate(dateFilter.getDate() - 7);
  if (range === '30d') dateFilter.setDate(dateFilter.getDate() - 30);
  if (range === 'all') dateFilter = new Date(0);

  if (metric === 'sales' || metric === 'orders') {
    const { data } = await supabase
      .from('orders')
      .select('total, created_at')
      .gte('created_at', dateFilter.toISOString());
      
    const totalSales = data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
    const totalOrders = data?.length || 0;
    
    return { totalSales, totalOrders, period: range };
  }
  
  if (metric === 'leads') {
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', dateFilter.toISOString());
      
    return { totalLeads: count || 0, period: range };
  }

  return { error: 'Invalid metric' };
}

export async function getLowStockProducts() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('id, title, stock')
    .lt('stock', 10)
    .limit(10);
    
  return data || [];
}

export async function getUserActivity(emailOrId: string) {
  const supabase = await createClient();
  
  // Find user first
  let userId = emailOrId;
  if (emailOrId.includes('@')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', emailOrId)
      .single();
    if (!profile) return { error: 'User not found' };
    userId = profile.id;
  }

  // Fetch Events
  const { data: events } = await supabase
    .from('analytics_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  // Fetch Orders
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    userId,
    recentEvents: events || [],
    recentOrders: orders || []
  };
}

export async function getUserJourney(identifier: string) {
  const supabase = await createClient();
  
  // Check if identifier is an email
  let userId = identifier;
  if (identifier.includes('@')) {
    const { data: user } = await supabase
      .from('profiles') // Assuming profiles table links email to id, or we query auth.users via admin client if needed
      .select('id')
      .eq('email', identifier)
      .single();
      
    if (user) userId = user.id;
    else {
        // If we can't find by email in profiles, we might need to search analytics_events metadata if we store email there
        // For now, let's assume we search by user_id directly or session_id
    }
  }

  const { data: events } = await supabase
    .from('analytics_events')
    .select('*')
    .or(`user_id.eq.${userId},session_id.eq.${userId}`)
    .order('created_at', { ascending: true })
    .limit(50);

  return events || [];
}

export async function getDetailedAnalytics(eventType?: string, limit: number = 20) {
  const supabase = await createClient();
  
  let query = supabase
    .from('analytics_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (eventType) {
    query = query.eq('event_type', eventType);
  }

  const { data } = await query;
  return data || [];
}
