-- Security fixes for Supabase lints (functions + RLS policies)
-- Replace <argtypes> with actual function signatures from pg_proc

-- 1) Fix search_path for functions
-- Use this query to find signatures:
-- SELECT p.oid::regprocedure
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname IN ('decrement_stock_with_serials','decrement_product_stock');

-- Example (replace <argtypes>):
-- ALTER FUNCTION public.decrement_stock_with_serials(<argtypes>) SET search_path = public, pg_temp;
-- ALTER FUNCTION public.decrement_product_stock(<argtypes>) SET search_path = public, pg_temp;

-- 2) Replace permissive RLS policies

-- analytics_events (restrict to authenticated only; assumes user_id column)
DROP POLICY IF EXISTS analytics_insert_anon_auth ON public.analytics_events;
DROP POLICY IF EXISTS analytics_insert_auth ON public.analytics_events;
CREATE POLICY analytics_insert_auth
ON public.analytics_events
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS analytics_select_admin ON public.analytics_events;
CREATE POLICY analytics_select_admin
ON public.analytics_events
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = (select auth.uid()) AND p.role = 'admin'
));

-- leads (restrict to authenticated only; assumes user_id column)
DROP POLICY IF EXISTS leads_insert_anon_auth ON public.leads;
DROP POLICY IF EXISTS leads_insert_auth ON public.leads;
CREATE POLICY leads_insert_auth
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS leads_select_admin ON public.leads;
CREATE POLICY leads_select_admin
ON public.leads
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = (select auth.uid()) AND p.role = 'admin'
));

-- custom_setup_variables (public read-only, admin write)
DROP POLICY IF EXISTS custom_setup_variables_all ON public.custom_setup_variables;
DROP POLICY IF EXISTS custom_setup_variables_read ON public.custom_setup_variables;
CREATE POLICY custom_setup_variables_read
ON public.custom_setup_variables
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS custom_setup_variables_admin_insert ON public.custom_setup_variables;
CREATE POLICY custom_setup_variables_admin_insert
ON public.custom_setup_variables
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = (select auth.uid()) AND p.role = 'admin'
));

DROP POLICY IF EXISTS custom_setup_variables_admin_update ON public.custom_setup_variables;
CREATE POLICY custom_setup_variables_admin_update
ON public.custom_setup_variables
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = (select auth.uid()) AND p.role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = (select auth.uid()) AND p.role = 'admin'
));

DROP POLICY IF EXISTS custom_setup_variables_admin_delete ON public.custom_setup_variables;
CREATE POLICY custom_setup_variables_admin_delete
ON public.custom_setup_variables
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = (select auth.uid()) AND p.role = 'admin'
));

-- security_audit_log (admin-only)
DROP POLICY IF EXISTS "Temporary access for security_audit_log" ON public.security_audit_log;
DROP POLICY IF EXISTS security_audit_log_admin_only ON public.security_audit_log;
CREATE POLICY security_audit_log_admin_only
ON public.security_audit_log
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = (select auth.uid()) AND p.role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = (select auth.uid()) AND p.role = 'admin'
));

-- security_settings (admin-only)
DROP POLICY IF EXISTS "Temporary access for security_settings" ON public.security_settings;
DROP POLICY IF EXISTS security_settings_admin_only ON public.security_settings;
CREATE POLICY security_settings_admin_only
ON public.security_settings
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = (select auth.uid()) AND p.role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = (select auth.uid()) AND p.role = 'admin'
));
