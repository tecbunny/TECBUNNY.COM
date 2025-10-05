-- Fix RLS security issues - Use app_metadata instead of user_metadata
-- app_metadata is only editable by admins, not end users
-- This addresses the security linter errors

BEGIN;

-- =====================================================
-- 1. Fix Profiles Table RLS Policies
-- =====================================================

-- Drop existing policies that use user_metadata
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create secure policies using app_metadata (admin-only editable)
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
        OR auth.uid() = id
    );

CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
        OR auth.uid() = id
    );

CREATE POLICY "Admins can delete profiles" ON public.profiles
    FOR DELETE USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- =====================================================
-- 2. Fix Settings Table RLS Policies
-- =====================================================

-- Drop existing policies that use user_metadata
DROP POLICY IF EXISTS "Anyone can read settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can delete settings" ON public.settings;

-- Create secure policies using app_metadata
CREATE POLICY "Anyone can read settings" ON public.settings
    FOR SELECT USING (true);

CREATE POLICY "Admins can insert settings" ON public.settings
    FOR INSERT WITH CHECK (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

CREATE POLICY "Admins can update settings" ON public.settings
    FOR UPDATE USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

CREATE POLICY "Admins can delete settings" ON public.settings
    FOR DELETE USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

-- =====================================================
-- 3. Enable RLS on Missing Tables
-- =====================================================

-- Enable RLS on zoho_sync_logs if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'zoho_sync_logs') THEN
        ALTER TABLE public.zoho_sync_logs ENABLE ROW LEVEL SECURITY;
        
        -- Create basic policies for zoho_sync_logs
        DROP POLICY IF EXISTS "Admins can manage zoho_sync_logs" ON public.zoho_sync_logs;
        CREATE POLICY "Admins can manage zoho_sync_logs" ON public.zoho_sync_logs
            FOR ALL USING (
                (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
            );
    END IF;
END $$;

-- Enable RLS on zoho_config if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'zoho_config') THEN
        ALTER TABLE public.zoho_config ENABLE ROW LEVEL SECURITY;
        
        -- Create basic policies for zoho_config
        DROP POLICY IF EXISTS "Admins can manage zoho_config" ON public.zoho_config;
        CREATE POLICY "Admins can manage zoho_config" ON public.zoho_config
            FOR ALL USING (
                (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
            );
    END IF;
END $$;

-- =====================================================
-- 4. Fix Security Definer View (if needed)
-- =====================================================

-- Drop and recreate the view without SECURITY DEFINER
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_views WHERE schemaname = 'public' AND viewname = 'active_products_with_pricing') THEN
        DROP VIEW IF EXISTS public.active_products_with_pricing;
        
        -- Recreate with SECURITY INVOKER (uses permissions of querying user, not view creator)
        CREATE VIEW public.active_products_with_pricing
        WITH (security_invoker = true)
        AS
        SELECT
            p.*,
            COALESCE(pp.price, p.price) as effective_price,
            pp.customer_type,
            pp.customer_category
        FROM public.products p
        LEFT JOIN public.product_pricing pp ON p.id = pp.product_id
            AND pp.is_active = true
            AND (pp.valid_from IS NULL OR pp.valid_from <= NOW())
            AND (pp.valid_to IS NULL OR pp.valid_to >= NOW())
        WHERE p.status = 'active';
    END IF;
END $$;

COMMIT;

-- =====================================================
-- IMPORTANT: Update Admin Users App Metadata
-- =====================================================
-- After running this migration, you MUST update admin users to use app_metadata
-- Run this in a separate transaction or via Supabase Auth Admin API:
-- 
-- UPDATE auth.users 
-- SET raw_app_meta_data = jsonb_set(
--     COALESCE(raw_app_meta_data, '{}'::jsonb),
--     '{role}',
--     to_jsonb(raw_user_meta_data->>'role')
-- )
-- WHERE email IN ('tecbunnysolutions@gmail.com', 'tecbunnysolution@gmail.com');
