-- Alter existing offers table to add missing columns
-- Since the table already exists, we'll add the missing columns

-- Add missing columns to the existing offers table
ALTER TABLE offers
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS minimum_purchase_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS minimum_order_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS usage_limit_per_customer INTEGER,
ADD COLUMN IF NOT EXISTS customer_eligibility TEXT DEFAULT 'all' CHECK (customer_eligibility IN ('all', 'new_customers', 'existing_customers', 'vip_customers')),
ADD COLUMN IF NOT EXISTS applicable_categories TEXT[],
ADD COLUMN IF NOT EXISTS applicable_products UUID[],
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Update discount_type check constraint to include all supported types
ALTER TABLE offers
DROP CONSTRAINT IF EXISTS offers_discount_type_check;

ALTER TABLE offers
ADD CONSTRAINT offers_discount_type_check
CHECK (discount_type IN ('percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping'));

-- Set default values for new columns
UPDATE offers
SET
  customer_eligibility = 'all',
  usage_count = 0
WHERE customer_eligibility IS NULL OR usage_count IS NULL;

-- Enable RLS if not already enabled
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active offers" ON offers;
DROP POLICY IF EXISTS "Admins can manage all offers" ON offers;

-- Recreate RLS Policies
CREATE POLICY "Anyone can view active offers" ON offers
  FOR SELECT USING (is_active = true AND start_date <= NOW() AND end_date >= NOW());

CREATE POLICY "Admins can manage all offers" ON offers
  FOR ALL USING (is_staff(auth.uid()));

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_offers_active_dates ON offers(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_offers_code ON offers(offer_code);
CREATE INDEX IF NOT EXISTS idx_offers_featured ON offers(is_featured, display_on_homepage);