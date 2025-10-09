-- Add missing product variants and options tables
-- Migration: 20251009170000_add_product_variants_options.sql

-- Product Options table
CREATE TABLE product_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  values TEXT[] NOT NULL,
  position INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Variants table
CREATE TABLE product_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  title TEXT,
  sku TEXT,
  barcode TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  compare_at_price DECIMAL(10,2),
  cost_per_item DECIMAL(10,2),
  weight DECIMAL(10,2),
  inventory_quantity INTEGER DEFAULT 0,
  option1 TEXT,
  option2 TEXT,
  option3 TEXT,
  position INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_product_options_product_id ON product_options(product_id);
CREATE INDEX idx_product_options_position ON product_options(product_id, position);

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_position ON product_variants(product_id, position);
CREATE INDEX idx_product_variants_sku ON product_variants(sku);
CREATE INDEX idx_product_variants_status ON product_variants(status);

-- Enable RLS
ALTER TABLE product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_options
CREATE POLICY "Product options are viewable by everyone" ON product_options
  FOR SELECT USING (true);

CREATE POLICY "Product options are manageable by admins" ON product_options
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin', 'manager')
    )
  );

-- RLS Policies for product_variants
CREATE POLICY "Product variants are viewable by everyone" ON product_variants
  FOR SELECT USING (true);

CREATE POLICY "Product variants are manageable by admins" ON product_variants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin', 'manager')
    )
  );