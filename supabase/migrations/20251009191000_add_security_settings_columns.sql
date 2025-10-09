-- Add missing columns to security_settings table
-- The API expects description and is_active columns

ALTER TABLE security_settings
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing records to be active
UPDATE security_settings
SET is_active = true
WHERE is_active IS NULL;

-- Add RLS policies for security_settings
DROP POLICY IF EXISTS "Admins can manage security settings" ON security_settings;
CREATE POLICY "Admins can manage security settings" ON security_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );