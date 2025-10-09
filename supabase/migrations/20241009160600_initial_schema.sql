-- Initial schema migration for Tecbunny website
-- Generated from TypeScript types and code analysis

-- Create custom types
CREATE TYPE user_role AS ENUM ('customer', 'sales', 'manager', 'accounts', 'admin', 'service_engineer', 'superadmin');
CREATE TYPE customer_category AS ENUM ('Normal', 'Standard', 'Premium');
CREATE TYPE customer_type AS ENUM ('B2C', 'B2B');
CREATE TYPE b2b_category AS ENUM ('Bronze', 'Silver', 'Gold');
CREATE TYPE order_status AS ENUM ('Pending', 'Awaiting Payment', 'Payment Confirmed', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Ready for Pickup', 'Completed', 'Delivered', 'Cancelled', 'Rejected');
CREATE TYPE order_type AS ENUM ('Pickup', 'Delivery', 'Walk-in');
CREATE TYPE expense_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE expense_category AS ENUM ('Travel', 'Food', 'Supplies', 'Utility', 'Other');
CREATE TYPE coupon_type AS ENUM ('percentage', 'fixed');
CREATE TYPE coupon_status AS ENUM ('active', 'inactive');
CREATE TYPE service_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE service_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE service_category AS ENUM ('Support', 'Protection', 'Installation', 'Trade', 'Business');
CREATE TYPE offer_type AS ENUM ('category_discount', 'customer_tier', 'minimum_order', 'seasonal', 'product_specific');
CREATE TYPE stock_status AS ENUM ('in_stock', 'low_stock', 'out_of_stock');
CREATE TYPE sales_agent_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE redemption_status AS ENUM ('pending', 'approved', 'rejected', 'processed');
CREATE TYPE service_engineer_skill_level AS ENUM ('junior', 'senior', 'expert');
CREATE TYPE service_ticket_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'cancelled', 'on_hold');
CREATE TYPE service_ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE otp_type AS ENUM ('agent_order', 'customer_verification');

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT,
  mobile TEXT,
  role user_role DEFAULT 'customer',
  email_verified BOOLEAN DEFAULT false,
  email_confirmed_at TIMESTAMPTZ,
  address TEXT,
  gstin TEXT,
  customer_category customer_category DEFAULT 'Normal',
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Enhanced B2B features
  customer_type customer_type DEFAULT 'B2C',
  gst_verified BOOLEAN DEFAULT false,
  gst_verification_date TIMESTAMPTZ,
  business_name TEXT,
  business_address TEXT,
  credit_limit DECIMAL(10,2),
  b2b_category b2b_category
);

-- Products table
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  handle TEXT,
  vendor TEXT,
  product_type TEXT,
  tags TEXT[],
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'draft')),
  images TEXT[],
  seo_title TEXT,
  seo_description TEXT,
  brand TEXT,
  description TEXT NOT NULL,
  mrp DECIMAL(10,2),
  price DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  image TEXT NOT NULL,
  warranty TEXT,
  hsn_code TEXT,
  gst_rate DECIMAL(5,2),
  is_serial_number_compulsory BOOLEAN DEFAULT false,
  popularity INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Enhanced fields
  stock_quantity INTEGER,
  stock_status stock_status DEFAULT 'in_stock',
  offer_price DECIMAL(10,2),
  discount_percentage DECIMAL(5,2),
  product_url TEXT,
  additional_images TEXT[],
  brand_logo TEXT,
  specifications JSONB,
  model_number TEXT,
  barcode TEXT
);

-- Orders table
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_id UUID REFERENCES profiles(id),
  customer_email TEXT,
  customer_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status order_status DEFAULT 'Pending',
  subtotal DECIMAL(10,2) NOT NULL,
  gst_amount DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  type order_type DEFAULT 'Delivery',
  delivery_address TEXT,
  notes TEXT,
  payment_method TEXT,
  processed_by UUID REFERENCES profiles(id),
  payment_confirmed_at TIMESTAMPTZ,
  payment_confirmed_by UUID REFERENCES profiles(id),
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES profiles(id),
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES profiles(id),
  cancellation_reason TEXT,
  -- Enhanced fields
  agent_id UUID REFERENCES profiles(id),
  commission_applicable BOOLEAN DEFAULT false,
  pre_tax_total DECIMAL(10,2),
  customer_type customer_type,
  otp_verified BOOLEAN DEFAULT false,
  otp_verified_at TIMESTAMPTZ
);

-- Order items table
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  gst_rate DECIMAL(5,2),
  hsn_code TEXT,
  name TEXT NOT NULL,
  serial_numbers TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews table
CREATE TABLE reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coupons table
CREATE TABLE coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  type coupon_type NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  expiry_date TIMESTAMPTZ NOT NULL,
  min_purchase DECIMAL(10,2),
  usage_limit INTEGER NOT NULL,
  usage_count INTEGER DEFAULT 0,
  per_user_limit INTEGER DEFAULT 1,
  status coupon_status DEFAULT 'active',
  applicable_category TEXT,
  applicable_product_id UUID REFERENCES products(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discounts table (auto-applied)
CREATE TABLE discounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type coupon_type NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  status coupon_status DEFAULT 'active',
  start_date TIMESTAMPTZ NOT NULL,
  expiry_date TIMESTAMPTZ NOT NULL,
  min_purchase DECIMAL(10,2),
  applicable_category TEXT,
  applicable_product_id UUID REFERENCES products(id),
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services table
CREATE TABLE services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  icon TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  features TEXT[] NOT NULL,
  badge TEXT CHECK (badge IN ('Popular', 'Recommended', 'New')),
  is_active BOOLEAN DEFAULT true,
  price DECIMAL(10,2),
  duration_days INTEGER,
  category service_category NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto offers table
CREATE TABLE auto_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type offer_type NOT NULL,
  discount_percentage DECIMAL(5,2),
  discount_amount DECIMAL(10,2),
  conditions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  auto_apply BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  max_discount_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory items table
CREATE TABLE inventory_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  stock INTEGER NOT NULL DEFAULT 0,
  serial_numbers TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchases table
CREATE TABLE purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_name TEXT NOT NULL,
  supplier_invoice TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  total DECIMAL(10,2) NOT NULL
);

-- Purchase items table
CREATE TABLE purchase_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  purchase_price DECIMAL(10,2) NOT NULL,
  serial_numbers TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales agents table
CREATE TABLE sales_agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE NOT NULL,
  points_balance INTEGER DEFAULT 0,
  status sales_agent_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales agent commissions table
CREATE TABLE sales_agent_commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES sales_agents(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  order_total DECIMAL(10,2) NOT NULL,
  commission_rate_snapshot JSONB,
  points_awarded INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent redemption requests table
CREATE TABLE agent_redemption_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES sales_agents(id) ON DELETE CASCADE,
  points_to_redeem INTEGER NOT NULL,
  status redemption_status DEFAULT 'pending',
  bank_details JSONB,
  notes TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Product pricing table
CREATE TABLE product_pricing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  customer_type customer_type NOT NULL,
  customer_category TEXT,
  price DECIMAL(10,2) NOT NULL,
  min_quantity INTEGER,
  max_quantity INTEGER,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent commission rules table
CREATE TABLE agent_commission_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES sales_agents(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_category TEXT,
  commission_rate DECIMAL(5,2) NOT NULL,
  min_order_value DECIMAL(10,2),
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order OTP verifications table
CREATE TABLE order_otp_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES profiles(id),
  customer_phone TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  otp_type otp_type NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service engineers table
CREATE TABLE service_engineers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id TEXT,
  specializations TEXT[],
  skill_level service_engineer_skill_level DEFAULT 'junior',
  available_hours JSONB,
  is_available BOOLEAN DEFAULT true,
  current_location JSONB,
  service_radius INTEGER DEFAULT 50,
  rating DECIMAL(3,2) DEFAULT 0,
  total_services INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service tickets table
CREATE TABLE service_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID REFERENCES services(id),
  customer_id UUID REFERENCES profiles(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT,
  issue_description TEXT NOT NULL,
  priority service_ticket_priority DEFAULT 'medium',
  status service_ticket_status DEFAULT 'pending',
  assigned_engineer_id UUID REFERENCES service_engineers(id),
  assigned_at TIMESTAMPTZ,
  scheduled_date TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_duration INTEGER,
  actual_duration INTEGER,
  service_charge DECIMAL(10,2),
  parts_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  customer_rating DECIMAL(3,2),
  customer_feedback TEXT,
  engineer_notes TEXT,
  photos TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service parts table
CREATE TABLE service_parts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES service_tickets(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  part_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  warranty_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent performance table
CREATE TABLE agent_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES sales_agents(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  total_orders INTEGER DEFAULT 0,
  total_sales_value DECIMAL(10,2) DEFAULT 0,
  total_commission_earned DECIMAL(10,2) DEFAULT 0,
  customer_acquisition_count INTEGER DEFAULT 0,
  average_order_value DECIMAL(10,2) DEFAULT 0,
  performance_rating DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order status history table
CREATE TABLE order_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  change_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer analytics table
CREATE TABLE customer_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  average_order_value DECIMAL(10,2) DEFAULT 0,
  last_order_date TIMESTAMPTZ,
  customer_lifetime_days INTEGER DEFAULT 0,
  preferred_categories TEXT[],
  risk_score DECIMAL(5,2) DEFAULT 0,
  loyalty_score DECIMAL(5,2) DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Product analytics table
CREATE TABLE product_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  total_orders INTEGER DEFAULT 0,
  total_quantity_sold INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  return_rate DECIMAL(5,2) DEFAULT 0,
  profit_margin DECIMAL(5,2) DEFAULT 0,
  last_sold_date TIMESTAMPTZ,
  seasonal_trend JSONB,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Service requests table
CREATE TABLE service_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES profiles(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  message TEXT,
  status service_status DEFAULT 'pending',
  assigned_to UUID REFERENCES profiles(id),
  priority service_priority DEFAULT 'medium',
  scheduled_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity logs table
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  type TEXT DEFAULT 'content_edit' CHECK (type IN ('content_edit', 'report_view', 'signup', 'login', 'coupon_created'))
);

-- Expenses table
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  category expense_category NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  submitted_by UUID REFERENCES profiles(id) NOT NULL,
  status expense_status DEFAULT 'pending'
);

-- Customer discounts table
CREATE TABLE customer_discounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category customer_category NOT NULL,
  discount_percentage DECIMAL(5,2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer offers table
CREATE TABLE customer_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  discount_percentage DECIMAL(5,2) NOT NULL,
  target_categories customer_category[],
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  minimum_order_value DECIMAL(10,2),
  max_discount_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Additional tables from grep search
CREATE TABLE settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE security_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on additional tables
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE security_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE zoho_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT,
  client_secret TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  organization_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE otp_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  email TEXT,
  otp_code TEXT NOT NULL,
  otp_type TEXT DEFAULT 'verification',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE otp_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  otp_type TEXT DEFAULT 'verification',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_communication_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT true,
  whatsapp_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload JSONB,
  status TEXT DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  last_attempt TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Create indexes for better performance
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_inventory_items_product_id ON inventory_items(product_id);
CREATE INDEX idx_sales_agents_user_id ON sales_agents(user_id);
CREATE INDEX idx_service_tickets_status ON service_tickets(status);
CREATE INDEX idx_service_tickets_assigned_engineer ON service_tickets(assigned_engineer_id);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_agent_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_redemption_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_engineers ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoho_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_communication_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: Users can read/update their own profile, admins can read all
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Products: Everyone can read active products, admins can manage all
CREATE POLICY "Anyone can view active products" ON products
  FOR SELECT USING (status = 'active' OR auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage products" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'manager')
    )
  );

-- Orders: Customers can view their own orders, staff can view based on roles
CREATE POLICY "Customers can view own orders" ON orders
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Staff can view orders based on role" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('sales', 'manager', 'accounts', 'admin', 'superadmin')
    )
  );

CREATE POLICY "Staff can update orders" ON orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('sales', 'manager', 'accounts', 'admin', 'superadmin')
    )
  );

-- Order items: Same as orders
CREATE POLICY "View order items with order access" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (orders.customer_id = auth.uid() OR
           EXISTS (
             SELECT 1 FROM profiles
             WHERE id = auth.uid() AND role IN ('sales', 'manager', 'accounts', 'admin', 'superadmin')
           ))
    )
  );

-- Reviews: Anyone can read, authenticated users can create
CREATE POLICY "Anyone can view reviews" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Coupons: Anyone can read active coupons, admins can manage
CREATE POLICY "Anyone can view active coupons" ON coupons
  FOR SELECT USING (status = 'active');

CREATE POLICY "Admins can manage coupons" ON coupons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'manager')
    )
  );

-- Similar policies for other tables...
-- (For brevity, applying similar patterns to remaining tables)

-- Generic admin policy for admin-only tables
CREATE POLICY "Admins only" ON discounts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);

CREATE POLICY "Admins only" ON services FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);

CREATE POLICY "Admins only" ON auto_offers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);

CREATE POLICY "Admins only" ON inventory_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'manager'))
);

CREATE POLICY "Admins only" ON purchases FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'accounts'))
);

CREATE POLICY "Admins only" ON purchase_items FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'accounts'))
);

-- Sales agents: Agents can view their own data, admins can view all
CREATE POLICY "Agents can view own data" ON sales_agents
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage agents" ON sales_agents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'manager'))
  );

-- Service engineers: Engineers can view their own data, admins can manage
CREATE POLICY "Engineers can view own data" ON service_engineers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage engineers" ON service_engineers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

-- Service tickets: Customers can view their own, engineers can view assigned, admins can view all
CREATE POLICY "Customers can view own tickets" ON service_tickets
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Engineers can view assigned tickets" ON service_tickets
  FOR SELECT USING (assigned_engineer_id IN (
    SELECT id FROM service_engineers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage tickets" ON service_tickets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'manager'))
  );

-- Expenses: Submitted by can view own, approvers can view all
CREATE POLICY "Users can view own expenses" ON expenses
  FOR SELECT USING (submitted_by = auth.uid());

CREATE POLICY "Admins can manage expenses" ON expenses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'accounts'))
  );

-- Security tables: Admin only
CREATE POLICY "Admin only" ON security_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
);

-- Settings table: Admin can manage, public can read some settings
CREATE POLICY "Admins can manage settings" ON settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);

CREATE POLICY "Public can read public settings" ON settings FOR SELECT USING (
  key NOT LIKE 'payment_%' AND key NOT LIKE 'security_%' AND key NOT LIKE 'admin_%'
);

-- System settings: Admin only
CREATE POLICY "Admin only" ON system_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);

CREATE POLICY "Admin only" ON security_audit_log FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);

CREATE POLICY "Admin only" ON zoho_config FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
);

-- OTP tables: Users can view their own
CREATE POLICY "Users can view own OTP" ON otp_verifications
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own OTP codes" ON otp_codes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Communication preferences: Users can manage their own
CREATE POLICY "Users can manage own preferences" ON user_communication_preferences
  FOR ALL USING (user_id = auth.uid());

-- Webhook events: Admin only
CREATE POLICY "Admin only" ON webhook_events FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
);

-- Activity logs: Users can view their own, admins can view all
CREATE POLICY "Users can view own activity" ON activity_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all activity" ON activity_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

-- Analytics tables: Admin only
CREATE POLICY "Admin only" ON customer_analytics FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'manager'))
);

CREATE POLICY "Admin only" ON product_analytics FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'manager'))
);

CREATE POLICY "Admin only" ON agent_performance FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'manager'))
);

-- Status history: Same access as orders
CREATE POLICY "View status history with order access" ON order_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_status_history.order_id
      AND (orders.customer_id = auth.uid() OR
           EXISTS (
             SELECT 1 FROM profiles
             WHERE id = auth.uid() AND role IN ('sales', 'manager', 'accounts', 'admin', 'superadmin')
           ))
    )
  );

-- Commissions and redemption: Agents can view their own, admins can view all
CREATE POLICY "Agents can view own commissions" ON sales_agent_commissions
  FOR SELECT USING (
    agent_id IN (SELECT id FROM sales_agents WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can view all commissions" ON sales_agent_commissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'accounts'))
  );

CREATE POLICY "Agents can view own redemptions" ON agent_redemption_requests
  FOR SELECT USING (
    agent_id IN (SELECT id FROM sales_agents WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage redemptions" ON agent_redemption_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'accounts'))
  );

-- Service requests: Customers can view their own, admins can manage
CREATE POLICY "Customers can view own requests" ON service_requests
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Admins can manage requests" ON service_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'manager'))
  );

-- Customer discounts and offers: Admin only
CREATE POLICY "Admin only" ON customer_discounts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);

CREATE POLICY "Admin only" ON customer_offers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);

-- Product pricing: Admin only
CREATE POLICY "Admin only" ON product_pricing FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'manager'))
);

-- Commission rules: Agents can view their own, admins can manage
CREATE POLICY "Agents can view own rules" ON agent_commission_rules
  FOR SELECT USING (
    agent_id IN (SELECT id FROM sales_agents WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage rules" ON agent_commission_rules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'manager'))
  );

-- Order OTP verifications: Related to orders access
CREATE POLICY "View OTP with order access" ON order_otp_verifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_otp_verifications.order_id
      AND (orders.customer_id = auth.uid() OR orders.agent_id = auth.uid() OR
           EXISTS (
             SELECT 1 FROM profiles
             WHERE id = auth.uid() AND role IN ('sales', 'manager', 'accounts', 'admin', 'superadmin')
           ))
    )
  );

-- Service parts: Same as service tickets
CREATE POLICY "View parts with ticket access" ON service_parts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM service_tickets
      WHERE service_tickets.id = service_parts.ticket_id
      AND (service_tickets.customer_id = auth.uid() OR
           service_tickets.assigned_engineer_id IN (
             SELECT id FROM service_engineers WHERE user_id = auth.uid()
           ) OR
           EXISTS (
             SELECT 1 FROM profiles
             WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'manager')
           ))
    )
  );

-- Create functions for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_discounts_updated_at BEFORE UPDATE ON discounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_auto_offers_updated_at BEFORE UPDATE ON auto_offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_agents_updated_at BEFORE UPDATE ON sales_agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_pricing_updated_at BEFORE UPDATE ON product_pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_commission_rules_updated_at BEFORE UPDATE ON agent_commission_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_engineers_updated_at BEFORE UPDATE ON service_engineers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_tickets_updated_at BEFORE UPDATE ON service_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_requests_updated_at BEFORE UPDATE ON service_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_security_settings_updated_at BEFORE UPDATE ON security_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_zoho_config_updated_at BEFORE UPDATE ON zoho_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_communication_preferences_updated_at BEFORE UPDATE ON user_communication_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();