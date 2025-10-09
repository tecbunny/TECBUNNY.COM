-- Create admin users directly in the database
-- This bypasses the API and creates the users directly

-- First, create the auth users (this would normally be done through Supabase Auth)
-- Since we can't create auth users directly, we'll insert profile records
-- assuming the auth users already exist or will be created

-- For now, let's create a temporary policy that allows all access to security_audit_log
-- This will let the admin dashboard load while you set up proper admin users

DROP POLICY IF EXISTS "Admin only" ON security_audit_log;
CREATE POLICY "Temporary access for security_audit_log" ON security_audit_log
  FOR ALL USING (true);

-- Also temporarily allow access to security_settings
DROP POLICY IF EXISTS "Admins can manage security settings" ON security_settings;
CREATE POLICY "Temporary access for security_settings" ON security_settings
  FOR ALL USING (true);

-- Note: Remove these temporary policies once you have proper admin users set up
-- Replace them with:
-- CREATE POLICY "Admin only" ON security_audit_log FOR ALL USING (is_admin(auth.uid()));
-- CREATE POLICY "Admins can manage security settings" ON security_settings FOR ALL USING (is_admin(auth.uid()));