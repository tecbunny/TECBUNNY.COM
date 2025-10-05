-- Add ZOHO CRM and Inventory sync columns to existing tables

-- Add ZOHO CRM ID to profiles (customers)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS zoho_crm_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS zoho_synced_at TIMESTAMPTZ;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_zoho_crm_id 
ON profiles(zoho_crm_id) WHERE zoho_crm_id IS NOT NULL;

-- Add ZOHO Order ID to orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS zoho_order_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS zoho_deal_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS zoho_synced_at TIMESTAMPTZ;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_orders_zoho_order_id 
ON orders(zoho_order_id) WHERE zoho_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_zoho_deal_id 
ON orders(zoho_deal_id) WHERE zoho_deal_id IS NOT NULL;

-- Products table should already have zoho_item_id from previous migration
-- But let's ensure it exists
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS zoho_item_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS zoho_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_products_zoho_item_id 
ON products(zoho_item_id) WHERE zoho_item_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN profiles.zoho_crm_id IS 'Reference to Contact ID in ZOHO CRM';
COMMENT ON COLUMN profiles.zoho_synced_at IS 'Last synchronization timestamp with ZOHO CRM';

COMMENT ON COLUMN orders.zoho_order_id IS 'Reference to Sales Order ID in ZOHO Inventory';
COMMENT ON COLUMN orders.zoho_deal_id IS 'Reference to Deal ID in ZOHO CRM';
COMMENT ON COLUMN orders.zoho_synced_at IS 'Last synchronization timestamp with ZOHO';

COMMENT ON COLUMN products.zoho_item_id IS 'Reference to Item ID in ZOHO Inventory';
COMMENT ON COLUMN products.zoho_synced_at IS 'Last synchronization timestamp with ZOHO Inventory';

SELECT 'ZOHO CRM & Inventory sync columns added successfully!' AS message;
