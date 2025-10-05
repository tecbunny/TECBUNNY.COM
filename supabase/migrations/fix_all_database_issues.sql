-- Comprehensive database fixes for RLS policies and missing columns

BEGIN;

-- =====================================================
-- 1. Fix Settings Table RLS Policies (406 errors)
-- =====================================================

-- Drop existing settings policies
DROP POLICY IF EXISTS "Public can read settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;

-- Create permissive policies for settings
CREATE POLICY "Anyone can read settings" ON public.settings
    FOR SELECT USING (true);

CREATE POLICY "Admins can insert settings" ON public.settings
    FOR INSERT WITH CHECK (
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

CREATE POLICY "Admins can update settings" ON public.settings
    FOR UPDATE USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

CREATE POLICY "Admins can delete settings" ON public.settings
    FOR DELETE USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

-- =====================================================
-- 2. Fix Products Table - Add missing reviewCount column
-- =====================================================

-- Add reviewCount column if it doesn't exist
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER DEFAULT 0;

-- Add review_count as alias (snake_case)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Update existing products
UPDATE public.products SET "reviewCount" = 0 WHERE "reviewCount" IS NULL;
UPDATE public.products SET review_count = 0 WHERE review_count IS NULL;

-- =====================================================
-- 3. Fix Profiles RLS - Allow admin delete operations
-- =====================================================

-- Drop existing delete policy if any
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- Create delete policy for admins
CREATE POLICY "Admins can delete profiles" ON public.profiles
    FOR DELETE USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

-- =====================================================
-- 4. Create Settings Table if not exists
-- =====================================================

CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Insert default settings if they don't exist
INSERT INTO public.settings (key, value, description)
VALUES 
    ('siteName', '"TecBunny Store"'::json, 'Website name'),
    ('siteDescription', '"Your Tech Store"'::json, 'Website description'),
    ('logoUrl', '"/brand.png"'::json, 'Logo URL'),
    ('faviconUrl', '"/brand.png"'::json, 'Favicon URL')
ON CONFLICT (key) DO NOTHING;

COMMIT;
