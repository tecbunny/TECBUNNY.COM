-- =============================================
-- Clear All Coupons Script
-- Removes all coupons and related data
-- =============================================

BEGIN;

-- First, handle any dependencies and related data
-- Note: This script assumes proper cascading is set up in the database

-- Clear coupon-related data in order of dependencies
-- 1. Clear any order_items that reference coupons
-- 2. Clear any coupon usage tracking
-- 3. Clear any user-coupon relationships
-- 4. Clear coupons themselves

-- Clear coupon usage history (if such table exists)
-- DELETE FROM public.coupon_usage WHERE coupon_id IS NOT NULL;

-- Clear any user-specific coupon assignments (if such table exists)
-- DELETE FROM public.user_coupons WHERE coupon_id IS NOT NULL;

-- Clear any cart items that might reference coupons
-- DELETE FROM public.cart_items WHERE coupon_id IS NOT NULL;

-- Clear coupon references from orders (if such column exists)
-- UPDATE public.orders SET coupon_id = NULL WHERE coupon_id IS NOT NULL;

-- Clear coupon references from order_items (if such column exists)
-- UPDATE public.order_items SET coupon_id = NULL WHERE coupon_id IS NOT NULL;

-- Clear any coupon product mappings (if such table exists)
-- DELETE FROM public.coupon_products WHERE coupon_id IS NOT NULL;

-- Clear any coupon category mappings (if such table exists)
-- DELETE FROM public.coupon_categories WHERE coupon_id IS NOT NULL;

-- Clear any coupon user restrictions (if such table exists)
-- DELETE FROM public.coupon_user_restrictions WHERE coupon_id IS NOT NULL;

-- Clear any promotional campaign coupons (if such table exists)
-- DELETE FROM public.campaign_coupons WHERE coupon_id IS NOT NULL;

-- Clear any coupon redemption tracking (if such table exists)
-- DELETE FROM public.coupon_redemptions WHERE coupon_id IS NOT NULL;

-- Clear all coupons
DELETE FROM public.coupons;

-- Reset the sequence if it exists (handle different possible sequence names)
DO $$
BEGIN
    -- Try common sequence naming patterns for coupons
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'coupons_id_seq') THEN
        PERFORM setval('coupons_id_seq', 1, false);
    ELSIF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'coupons_seq') THEN
        PERFORM setval('coupons_seq', 1, false);
    ELSIF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename LIKE '%coupons%id%seq') THEN
        PERFORM setval(sequencename, 1, false) 
        FROM pg_sequences 
        WHERE schemaname = 'public' AND sequencename LIKE '%coupons%id%seq'
        LIMIT 1;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Coupons sequence reset skipped: %', SQLERRM;
END $$;

-- Clear any cached coupon data
-- This would be application-specific and might involve:
-- 1. Clearing Redis cache if you cache valid coupons
-- 2. Clearing any in-memory coupon validation cache
-- 3. Invalidating CDN cache for coupon-related API endpoints

-- Verify deletion
SELECT 'All coupons cleared successfully!' as message;
SELECT 
    COUNT(*) as remaining_coupons,
    CASE 
        WHEN COUNT(*) = 0 THEN 'SUCCESS: All coupons deleted'
        ELSE 'WARNING: Some coupons remain'
    END as status
FROM public.coupons;

-- Show sequence status (if any sequences exist)
DO $$
DECLARE
    seq_info RECORD;
    seq_found BOOLEAN := false;
BEGIN
    FOR seq_info IN 
        SELECT schemaname, sequencename, last_value
        FROM pg_sequences 
        WHERE schemaname = 'public' AND sequencename LIKE '%coupons%'
    LOOP
        RAISE NOTICE 'Sequence: %.%, Last Value: %', 
                     seq_info.schemaname, seq_info.sequencename, 
                     seq_info.last_value;
        seq_found := true;
    END LOOP;
    
    IF NOT seq_found THEN
        RAISE NOTICE 'No sequences found for coupons table';
    END IF;
END $$;

-- Show any tables that might still reference coupons (for debugging)
/*
SELECT 
    table_name,
    column_name,
    constraint_name
FROM information_schema.key_column_usage 
WHERE referenced_table_name = 'coupons'
   OR constraint_name LIKE '%coupon%';
*/

COMMIT;

-- Optional: Clean up any orphaned data
-- Note: These are commented out as they depend on your specific database schema
-- Uncomment and modify as needed based on your actual table structure

/*
-- Clean up orphaned coupon analytics (if you track coupon performance)
DELETE FROM public.coupon_analytics 
WHERE coupon_id NOT IN (SELECT id FROM public.coupons);

-- Clean up any notification templates related to coupons
DELETE FROM public.notification_templates 
WHERE template_type = 'coupon' 
AND reference_id NOT IN (SELECT id FROM public.coupons);

-- Clean up any email marketing campaigns that reference deleted coupons
DELETE FROM public.email_campaigns 
WHERE campaign_type = 'coupon_promotion' 
AND reference_id NOT IN (SELECT id FROM public.coupons);

-- Clean up any audit logs related to coupons (optional, depends on retention policy)
DELETE FROM public.audit_logs 
WHERE entity_type = 'coupon' 
AND entity_id NOT IN (SELECT id FROM public.coupons);
*/