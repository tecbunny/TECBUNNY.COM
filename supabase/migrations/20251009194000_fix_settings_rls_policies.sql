-- Fix settings table RLS policies to use security definer functions
-- This prevents infinite recursion issues

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can manage settings" ON settings;
DROP POLICY IF EXISTS "Public can read public settings" ON settings;
DROP POLICY IF EXISTS "Admin only" ON system_settings;
DROP POLICY IF EXISTS "Admin only" ON security_settings;
DROP POLICY IF EXISTS "Admins can manage security settings" ON security_settings;
DROP POLICY IF EXISTS "Admin only" ON security_audit_log;

-- Recreate settings policies with fixed functions
CREATE POLICY "Admins can manage settings" ON settings
  FOR ALL USING (is_staff(auth.uid()));

CREATE POLICY "Public can read public settings" ON settings
  FOR SELECT USING (
    key NOT LIKE 'payment_%' AND key NOT LIKE 'security_%' AND key NOT LIKE 'admin_%'
  );

-- System settings policies
CREATE POLICY "Admin only" ON system_settings
  FOR ALL USING (is_admin(auth.uid()));

-- Security settings policies
CREATE POLICY "Admins can manage security settings" ON security_settings
  FOR ALL USING (is_admin(auth.uid()));

-- Security audit log policies
CREATE POLICY "Admin only" ON security_audit_log
  FOR ALL USING (is_admin(auth.uid()));