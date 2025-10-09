-- Fix all RLS policies that reference profiles table directly
-- Replace with security definer functions to avoid infinite recursion

-- Settings table policies
DROP POLICY IF EXISTS "Admins can manage settings" ON settings;
CREATE POLICY "Admins can manage settings" ON settings
  FOR ALL USING (is_staff(auth.uid()));

-- System settings policies
DROP POLICY IF EXISTS "Admin only" ON system_settings;
CREATE POLICY "Admin only" ON system_settings
  FOR ALL USING (is_admin(auth.uid()));

-- Security settings policies (already fixed in previous migration, but ensure consistency)
DROP POLICY IF EXISTS "Admin only" ON security_settings;
DROP POLICY IF EXISTS "Admins can manage security settings" ON security_settings;
CREATE POLICY "Admins can manage security settings" ON security_settings
  FOR ALL USING (is_admin(auth.uid()));

-- Security audit log policies
DROP POLICY IF EXISTS "Admin only" ON security_audit_log;
CREATE POLICY "Admin only" ON security_audit_log
  FOR ALL USING (is_admin(auth.uid()));

-- Zoho config policies
DROP POLICY IF EXISTS "Admin only" ON zoho_config;
CREATE POLICY "Admin only" ON zoho_config
  FOR ALL USING (is_admin(auth.uid()));

-- User communication preferences policies
DROP POLICY IF EXISTS "Users can manage own preferences" ON user_communication_preferences;
DROP POLICY IF EXISTS "Admins can manage all preferences" ON user_communication_preferences;
CREATE POLICY "Users can manage own preferences" ON user_communication_preferences
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all preferences" ON user_communication_preferences
  FOR ALL USING (is_admin(auth.uid()));

-- Agent commission rules policies
DROP POLICY IF EXISTS "Admins can manage commission rules" ON agent_commission_rules;
CREATE POLICY "Admins can manage commission rules" ON agent_commission_rules
  FOR ALL USING (is_staff(auth.uid()));

-- Service engineers policies
DROP POLICY IF EXISTS "Admins can manage service engineers" ON service_engineers;
CREATE POLICY "Admins can manage service engineers" ON service_engineers
  FOR ALL USING (is_staff(auth.uid()));

-- Service tickets policies
DROP POLICY IF EXISTS "Staff can manage service tickets" ON service_tickets;
CREATE POLICY "Staff can manage service tickets" ON service_tickets
  FOR ALL USING (is_staff(auth.uid()));

-- Service requests policies
DROP POLICY IF EXISTS "Users can view own requests" ON service_requests;
DROP POLICY IF EXISTS "Staff can manage service requests" ON service_requests;
CREATE POLICY "Users can view own requests" ON service_requests
  FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Staff can manage service requests" ON service_requests
  FOR ALL USING (is_staff(auth.uid()));

-- Webhook events policies
DROP POLICY IF EXISTS "Admin only" ON webhook_events;
CREATE POLICY "Admin only" ON webhook_events
  FOR ALL USING (is_admin(auth.uid()));