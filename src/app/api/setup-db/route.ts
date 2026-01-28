import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const sql = `
    -- Analytics Events Table
    CREATE TABLE IF NOT EXISTS analytics_events (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      session_id TEXT,
      user_id UUID REFERENCES auth.users(id),
      event_type TEXT NOT NULL,
      page_url TEXT,
      resource_id TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_analytics_events_resource ON analytics_events(resource_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);

    -- Leads Table
    CREATE TABLE IF NOT EXISTS leads (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES auth.users(id),
      type TEXT NOT NULL,
      status TEXT DEFAULT 'new',
      product_id TEXT,
      customer_name TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- View for Product Analytics
    CREATE OR REPLACE VIEW product_analytics_view AS
    SELECT 
      p.id,
      p.title,
      COUNT(DISTINCT CASE WHEN ae.event_type = 'product_view' THEN ae.id END) as view_count,
      COUNT(DISTINCT CASE WHEN ae.event_type = 'add_to_cart' THEN ae.id END) as cart_count,
      COUNT(DISTINCT CASE WHEN l.type IN ('amc', 'installation') AND l.product_id = p.id::text THEN l.id END) as inquiry_count,
      (
        (COUNT(DISTINCT CASE WHEN ae.event_type = 'product_view' THEN ae.id END) * 1) +
        (COUNT(DISTINCT CASE WHEN ae.event_type = 'add_to_cart' THEN ae.id END) * 5) +
        (COUNT(DISTINCT CASE WHEN l.type IN ('amc', 'installation') AND l.product_id = p.id::text THEN l.id END) * 10)
      ) as engagement_score
    FROM products p
    LEFT JOIN analytics_events ae ON ae.resource_id = p.id::text
    LEFT JOIN leads l ON l.product_id = p.id::text
    GROUP BY p.id, p.title;
  `;

  // Supabase JS client doesn't support raw SQL execution directly via .rpc() unless a function is defined.
  // However, we can use the 'postgres' library if available, or we might have to rely on the user to run the SQL.
  // BUT, if we are using the service role key, we might be able to do it?
  // Actually, the standard Supabase client cannot run raw SQL.
  
  // Plan B: We cannot run raw SQL from the client.
  // We must instruct the user to run the SQL in their Supabase Dashboard SQL Editor.
  
  return NextResponse.json({ 
    message: "Please run the SQL in supabase/migrations/20251206000000_analytics_setup.sql in your Supabase SQL Editor." 
  });
}
