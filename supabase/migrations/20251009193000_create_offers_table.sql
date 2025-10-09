-- Create offers table for promotional offers and discounts
CREATE TABLE offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  offer_code TEXT UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping')),
  discount_value DECIMAL(10,2),
  discount_percentage DECIMAL(5,2),
  minimum_purchase_amount DECIMAL(10,2),
  minimum_order_amount DECIMAL(10,2),
  maximum_discount_amount DECIMAL(10,2),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  display_on_homepage BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  banner_text TEXT,
  banner_color TEXT DEFAULT '#dc2626',
  terms_and_conditions TEXT,
  applicable_categories TEXT[],
  applicable_products UUID[],
  usage_limit INTEGER,
  usage_limit_per_customer INTEGER,
  usage_count INTEGER DEFAULT 0,
  customer_eligibility TEXT DEFAULT 'all' CHECK (customer_eligibility IN ('all', 'new_customers', 'existing_customers', 'vip_customers')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active offers" ON offers
  FOR SELECT USING (is_active = true AND start_date <= NOW() AND end_date >= NOW());

CREATE POLICY "Admins can manage all offers" ON offers
  FOR ALL USING (is_staff(auth.uid()));

-- Create indexes for better performance
CREATE INDEX idx_offers_active_dates ON offers(is_active, start_date, end_date);
CREATE INDEX idx_offers_code ON offers(offer_code);
CREATE INDEX idx_offers_featured ON offers(is_featured, display_on_homepage);