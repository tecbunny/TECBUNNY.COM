-- Add ZOHO integration support to products table
-- Run this migration in your Supabase SQL Editor

-- Add zoho_item_id column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS zoho_item_id VARCHAR(100);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_zoho_item_id 
ON products(zoho_item_id) 
WHERE zoho_item_id IS NOT NULL;

-- Add zoho_synced_at timestamp
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS zoho_synced_at TIMESTAMPTZ;

-- Create zoho_sync_logs table for audit trail
CREATE TABLE IF NOT EXISTS zoho_sync_logs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  direction VARCHAR(20) NOT NULL, -- 'to_zoho' or 'from_zoho'
  products_synced INTEGER DEFAULT 0,
  products_failed INTEGER DEFAULT 0,
  duration_ms INTEGER,
  status VARCHAR(20) NOT NULL, -- 'success', 'partial', 'failed'
  error_message TEXT,
  sync_details JSONB
);

-- Create index on created_at for performance
CREATE INDEX IF NOT EXISTS idx_zoho_sync_logs_created_at 
ON zoho_sync_logs(created_at DESC);

-- Create zoho_config table to store tokens securely (recommended for production)
CREATE TABLE IF NOT EXISTS zoho_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  encrypted BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Insert placeholder for tokens (update after OAuth)
INSERT INTO zoho_config (config_key, config_value, encrypted)
VALUES 
  ('access_token', '', TRUE),
  ('refresh_token', '', TRUE),
  ('client_id', '', FALSE),
  ('client_secret', '', TRUE),
  ('organization_id', '', FALSE)
ON CONFLICT (config_key) DO NOTHING;

-- Add comment explaining the purpose
COMMENT ON TABLE zoho_sync_logs IS 'Audit trail for ZOHO Inventory synchronization operations';
COMMENT ON TABLE zoho_config IS 'Secure storage for ZOHO API credentials and tokens';
COMMENT ON COLUMN products.zoho_item_id IS 'Reference to item ID in ZOHO Inventory';
COMMENT ON COLUMN products.zoho_synced_at IS 'Last synchronization timestamp with ZOHO';

-- Create function to update zoho_synced_at automatically
CREATE OR REPLACE FUNCTION update_zoho_synced_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.zoho_item_id IS NOT NULL AND 
     (OLD.zoho_item_id IS NULL OR OLD.zoho_item_id != NEW.zoho_item_id) THEN
    NEW.zoho_synced_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update zoho_synced_at
DROP TRIGGER IF EXISTS trigger_update_zoho_synced_at ON products;
CREATE TRIGGER trigger_update_zoho_synced_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_zoho_synced_at();

-- Grant necessary permissions (adjust role as needed)
-- GRANT SELECT, INSERT, UPDATE ON zoho_sync_logs TO authenticated;
-- GRANT SELECT ON zoho_config TO authenticated;
-- GRANT UPDATE (zoho_item_id, zoho_synced_at) ON products TO authenticated;

SELECT 'ZOHO integration database schema created successfully!' AS message;
