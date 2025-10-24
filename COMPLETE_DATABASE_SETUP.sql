-- =====================================================
-- TECBUNNY CONSOLIDATED DATABASE MIGRATION
-- =====================================================
-- Purpose: Complete database schema and setup
-- This file consolidates all migrations from the supabase/migrations folder
-- Run this ONCE in Supabase SQL Editor for fresh database setup
-- Date: October 11, 2025
-- =====================================================


-- Create custom enum types if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('customer', 'sales', 'manager', 'accounts', 'admin', 'service_engineer', 'superadmin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_category') THEN
    CREATE TYPE customer_category AS ENUM ('Normal', 'Standard', 'Premium');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_type') THEN
    CREATE TYPE customer_type AS ENUM ('B2C', 'B2B');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'b2b_category') THEN
    CREATE TYPE b2b_category AS ENUM ('Bronze', 'Silver', 'Gold');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM ('Pending', 'Awaiting Payment', 'Payment Confirmed', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Ready for Pickup', 'Completed', 'Delivered', 'Cancelled', 'Rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_type') THEN
    CREATE TYPE order_type AS ENUM ('Pickup', 'Delivery', 'Walk-in');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_status') THEN
    CREATE TYPE expense_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_category') THEN
    CREATE TYPE expense_category AS ENUM ('Travel', 'Food', 'Supplies', 'Utility', 'Other');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coupon_type') THEN
    CREATE TYPE coupon_type AS ENUM ('percentage', 'fixed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coupon_status') THEN
    CREATE TYPE coupon_status AS ENUM ('active', 'inactive');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_status') THEN
    CREATE TYPE service_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_priority') THEN
    CREATE TYPE service_priority AS ENUM ('low', 'medium', 'high', 'urgent');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_category') THEN
    CREATE TYPE service_category AS ENUM ('Support', 'Protection', 'Installation', 'Trade', 'Business');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'offer_type') THEN
    CREATE TYPE offer_type AS ENUM ('category_discount', 'customer_tier', 'minimum_order', 'seasonal', 'product_specific');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_status') THEN
    CREATE TYPE stock_status AS ENUM ('in_stock', 'low_stock', 'out_of_stock');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sales_agent_status') THEN
    CREATE TYPE sales_agent_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'redemption_status') THEN
    CREATE TYPE redemption_status AS ENUM ('pending', 'approved', 'rejected', 'processed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_engineer_skill_level') THEN
    CREATE TYPE service_engineer_skill_level AS ENUM ('junior', 'senior', 'expert');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_ticket_status') THEN
    CREATE TYPE service_ticket_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'cancelled', 'on_hold');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_ticket_priority') THEN
    CREATE TYPE service_ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'otp_type') THEN
    CREATE TYPE otp_type AS ENUM ('signup', 'recovery', 'agent_order', 'customer_verification');
  END IF;
END$$;

-- Ensure otp_type enum has required values for application flows
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'otp_type') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = 'otp_type'::regtype
        AND enumlabel = 'signup'
    ) THEN
      ALTER TYPE otp_type ADD VALUE 'signup';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = 'otp_type'::regtype
        AND enumlabel = 'recovery'
    ) THEN
      ALTER TYPE otp_type ADD VALUE 'recovery';
    END IF;
  END IF;
END$$;
-- =====================================================
-- SECTION 1.1: OTP CODES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  phone TEXT,
  otp TEXT NOT NULL,
  otp_code TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  type otp_type NOT NULL,
  channel TEXT,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Index for quick lookup of active OTPs (conditional on column existence)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'otp_codes' AND column_name = 'email'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_otp_codes_email_type
      ON otp_codes (email, type, used, expires_at);
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'otp_codes' AND column_name = 'phone'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_otp_codes_phone_type
      ON otp_codes (phone, type, used, expires_at);
  END IF;
END$$;

-- =====================================================
-- SECTION 2: CREATE CORE TABLES
-- =====================================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
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
  customer_type customer_type DEFAULT 'B2C',
  gst_verified BOOLEAN DEFAULT false,
  gst_verification_date TIMESTAMPTZ,
  business_name TEXT,
  business_address TEXT,
  credit_limit DECIMAL(10,2),
  b2b_category b2b_category
);

-- Products table with all enhancements
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  name TEXT NOT NULL,
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
  image TEXT,
  warranty TEXT,
  hsn_code TEXT,
  gst_rate DECIMAL(5,2),
  is_serial_number_compulsory BOOLEAN DEFAULT false,
  popularity INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  stock_quantity INTEGER,
  stock_status stock_status DEFAULT 'in_stock',
  offer_price DECIMAL(10,2),
  discount_percentage DECIMAL(5,2),
  product_url TEXT,
  additional_images TEXT[],
  brand_logo TEXT,
  specifications JSONB,
  model_number TEXT,
  barcode TEXT,
  display_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- Product variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
  title TEXT NOT NULL,
  option1 TEXT,
  option2 TEXT,
  option3 TEXT,
  sku TEXT,
  barcode TEXT,
  price DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2),
  inventory_quantity INTEGER DEFAULT 0,
  weight DECIMAL(10,3),
  weight_unit TEXT DEFAULT 'kg',
  requires_shipping BOOLEAN DEFAULT true,
  taxable BOOLEAN DEFAULT true,
  image TEXT,
  position INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product options table
CREATE TABLE IF NOT EXISTS product_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
  name TEXT NOT NULL,
  position INTEGER,
  values TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_id UUID REFERENCES profiles(id),
  customer_email TEXT,
  customer_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status order_status DEFAULT 'Pending',
  order_type order_type DEFAULT 'Delivery',
  total DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2),
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  shipping_amount DECIMAL(10,2) DEFAULT 0,
  delivery_address TEXT,
  notes TEXT,
  payment_method TEXT,
  payment_status TEXT,
  tracking_number TEXT,
  assigned_to UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  serial_numbers TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offers table
CREATE TABLE IF NOT EXISTS offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type offer_type NOT NULL,
  discount_percentage DECIMAL(5,2),
  discount_amount DECIMAL(10,2),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    CHECK (end_date >= start_date),
  category TEXT,
  customer_tier customer_category,
  minimum_order_amount DECIMAL(10,2),
  product_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure is_public column exists for idempotency
ALTER TABLE settings ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Page content table
CREATE TABLE IF NOT EXISTS page_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_key TEXT UNIQUE NOT NULL,
  content JSONB NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure is_published column exists for idempotency
ALTER TABLE page_content ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

-- Storage bucket for hero banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('hero-banners', 'hero-banners', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SECTION 3: CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_products_display_order ON products(display_order DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
-- Composite index for status and creation date to optimize filtering and sorting
CREATE INDEX IF NOT EXISTS idx_products_status_created_at ON products(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- =====================================================
-- SECTION 4: ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_content ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Products policies (public read, admin write)
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
CREATE POLICY "Anyone can view active products" ON products FOR SELECT USING (status = 'active' OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage products" ON products;
CREATE POLICY "Admins can manage products" ON products FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'manager'))
);

-- Product variants policies
DROP POLICY IF EXISTS "Anyone can view product variants" ON product_variants;
CREATE POLICY "Anyone can view product variants" ON product_variants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage product variants" ON product_variants;
CREATE POLICY "Admins can manage product variants" ON product_variants FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'manager'))
);

-- Product options policies
DROP POLICY IF EXISTS "Anyone can view product options" ON product_options;
CREATE POLICY "Anyone can view product options" ON product_options FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage product options" ON product_options;
CREATE POLICY "Admins can manage product options" ON product_options FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'manager'))
);

-- Orders policies
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Staff can view all orders" ON orders;
CREATE POLICY "Staff can view all orders" ON orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'manager', 'sales', 'accounts'))
);

-- Order items policies
DROP POLICY IF EXISTS "Users can view their order items" ON order_items;
CREATE POLICY "Users can view their order items" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE id = order_id AND customer_id = auth.uid())
);

-- Offers policies
DROP POLICY IF EXISTS "Anyone can view active offers" ON offers;
CREATE POLICY "Anyone can view active offers" ON offers FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage offers" ON offers;
CREATE POLICY "Admins can manage offers" ON offers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'manager'))
);

-- Settings policies
DROP POLICY IF EXISTS "Anyone can view public settings" ON settings;
CREATE POLICY "Anyone can view public settings" ON settings FOR SELECT USING (is_public = true OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage settings" ON settings;
CREATE POLICY "Admins can manage settings" ON settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
);

-- Page content policies
DROP POLICY IF EXISTS "Anyone can view published pages" ON page_content;
CREATE POLICY "Anyone can view published pages" ON page_content FOR SELECT USING (is_published = true OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can manage pages" ON page_content;
CREATE POLICY "Admins can manage pages" ON page_content FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'manager'))
);

-- =====================================================
-- SECTION 5: INITIAL DATA & FIXES
-- =====================================================

-- Ensure all products have 'name' field (copy from 'title' if needed)
UPDATE products SET name = title WHERE name IS NULL;

-- Set all products to active status
UPDATE products SET status = 'active' WHERE status IS NULL OR status NOT IN ('active', 'archived', 'draft');

-- Set initial display_order based on created_at (newest first)
WITH numbered_products AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at DESC) as row_num
  FROM products
  WHERE display_order IS NULL OR display_order = 0
)
UPDATE products p
SET display_order = np.row_num * 10
FROM numbered_products np
WHERE p.id = np.id;

-- =====================================================
-- SECTION 6: COMMENTS & DOCUMENTATION
-- =====================================================

COMMENT ON TABLE products IS 'Main products catalog with variants and options support';
COMMENT ON COLUMN products.display_order IS 'Controls display order in frontend. Higher values appear first. Gaps of 10 allow easy reordering.';
COMMENT ON COLUMN products.status IS 'Product status: active (visible), archived (hidden), draft (not published)';
COMMENT ON COLUMN products.name IS 'Product display name (user-facing)';
COMMENT ON COLUMN products.title IS 'Product admin title (legacy field)';

-- =====================================================
-- SECTION 7: VERIFICATION QUERIES
-- =====================================================

-- Verify table creation
SELECT 
  'Tables Created' as status,
  COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'products', 'product_variants', 'product_options', 'orders', 'order_items', 'offers', 'settings', 'page_content');

-- Verify products setup
SELECT 
  COUNT(*) as total_products,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_products,
  COUNT(CASE WHEN display_order > 0 THEN 1 END) as products_with_order
FROM products;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT 
  '✅ TECBUNNY DATABASE SETUP COMPLETE!' as status,
  'All tables, indexes, and policies created successfully' as message,
  'You can now use the application' as next_step;

-- =====================================================
-- END OF CONSOLIDATED MIGRATION
-- =====================================================
