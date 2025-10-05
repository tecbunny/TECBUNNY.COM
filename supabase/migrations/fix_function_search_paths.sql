-- Fix function search_path security warnings
-- Add explicit search_path to prevent injection attacks

-- =====================================================
-- 0. Ensure user_role type exists (skip if already exists)
-- =====================================================

-- This will fail silently if type already exists
DO $$ 
BEGIN
    CREATE TYPE user_role AS ENUM ('customer', 'sales', 'service_engineer', 'accounts', 'manager', 'admin', 'superadmin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 1. Fix update_updated_at_column function
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. Fix get_user_role function
-- =====================================================

DROP FUNCTION IF EXISTS public.get_user_role(UUID);

CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role
SET search_path = ''
AS $$
BEGIN
    RETURN (SELECT role FROM public.profiles WHERE id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. Fix has_permission function
-- =====================================================

DROP FUNCTION IF EXISTS public.has_permission(UUID, user_role);

CREATE OR REPLACE FUNCTION public.has_permission(user_uuid UUID, required_role user_role)
RETURNS BOOLEAN
SET search_path = ''
AS $$
DECLARE
    user_role_val user_role;
    role_hierarchy INTEGER;
    required_hierarchy INTEGER;
BEGIN
    SELECT role INTO user_role_val FROM public.profiles WHERE id = user_uuid;

    IF user_role_val IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Role hierarchy: customer(1), sales(2), service_engineer(2), accounts(3), manager(4), admin(5), superadmin(6)
    role_hierarchy := CASE user_role_val
        WHEN 'customer' THEN 1
        WHEN 'sales' THEN 2
        WHEN 'service_engineer' THEN 2
        WHEN 'accounts' THEN 3
        WHEN 'manager' THEN 4
        WHEN 'admin' THEN 5
        WHEN 'superadmin' THEN 6
        ELSE 0
    END;

    required_hierarchy := CASE required_role
        WHEN 'customer' THEN 1
        WHEN 'sales' THEN 2
        WHEN 'service_engineer' THEN 2
        WHEN 'accounts' THEN 3
        WHEN 'manager' THEN 4
        WHEN 'admin' THEN 5
        WHEN 'superadmin' THEN 6
        ELSE 0
    END;

    RETURN role_hierarchy >= required_hierarchy;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. Fix update_zoho_synced_at function
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_zoho_synced_at()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
    IF NEW.zoho_item_id IS NOT NULL AND 
       (OLD.zoho_item_id IS NULL OR OLD.zoho_item_id != NEW.zoho_item_id) THEN
        NEW.zoho_synced_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
