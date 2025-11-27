-- =============================================
-- Clear All Offers Script
-- Removes all offers and related data
-- =============================================

BEGIN;

-- First, disable any foreign key constraints temporarily if needed
-- Note: This script assumes proper cascading is set up in the database

-- Clear offer-related data in order of dependencies
-- 1. Clear any order_items that reference offers (if such relationship exists)
-- 2. Clear any user offer usage tracking (if exists)
-- 3. Clear offers themselves

-- Clear offer usage tracking (if you have such a table)
-- DELETE FROM public.offer_usage WHERE offer_id IS NOT NULL;

-- Clear any cart items that might reference offers
-- DELETE FROM public.cart_items WHERE offer_id IS NOT NULL;

-- Clear any order items that reference offers (if such column exists)
-- UPDATE public.order_items SET offer_id = NULL WHERE offer_id IS NOT NULL;

-- Clear any orders that reference offers directly (if such column exists)
-- UPDATE public.orders SET offer_id = NULL WHERE offer_id IS NOT NULL;

-- Clear any customer-specific offer assignments (if such table exists)
-- DELETE FROM public.customer_offers WHERE offer_id IS NOT NULL;

-- Clear any offer product mappings (if such table exists)
-- DELETE FROM public.offer_products WHERE offer_id IS NOT NULL;

-- Clear any offer category mappings (if such table exists)
-- DELETE FROM public.offer_categories WHERE offer_id IS NOT NULL;

-- Clear all offers
DELETE FROM public.offers;

-- Reset the sequence if it exists (handle different possible sequence names)
DO $$
BEGIN
    -- Try common sequence naming patterns for offers
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'offers_id_seq') THEN
        PERFORM setval('offers_id_seq', 1, false);
    ELSIF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'offers_seq') THEN
        PERFORM setval('offers_seq', 1, false);
    ELSIF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename LIKE '%offers%id%seq') THEN
        PERFORM setval(sequencename, 1, false) 
        FROM pg_sequences 
        WHERE schemaname = 'public' AND sequencename LIKE '%offers%id%seq'
        LIMIT 1;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Offers sequence reset skipped: %', SQLERRM;
END $$;

-- Clear any cached offer data (if you have such functionality)
-- This would be application-specific and might involve clearing Redis cache
-- or other caching mechanisms

-- Verify deletion
SELECT 'All offers cleared successfully!' as message;
SELECT 
    COUNT(*) as remaining_offers,
    CASE 
        WHEN COUNT(*) = 0 THEN 'SUCCESS: All offers deleted'
        ELSE 'WARNING: Some offers remain'
    END as status
FROM public.offers;

-- Show sequence status (if any sequences exist)
DO $$
DECLARE
    seq_info RECORD;
    seq_found BOOLEAN := false;
BEGIN
    FOR seq_info IN 
        SELECT schemaname, sequencename, last_value
        FROM pg_sequences 
        WHERE schemaname = 'public' AND sequencename LIKE '%offers%'
    LOOP
        RAISE NOTICE 'Sequence: %.%, Last Value: %', 
                     seq_info.schemaname, seq_info.sequencename, 
                     seq_info.last_value;
        seq_found := true;
    END LOOP;
    
    IF NOT seq_found THEN
        RAISE NOTICE 'No sequences found for offers table';
    END IF;
END $$;

COMMIT;

-- Optional: Clean up any orphaned data
-- Note: These are commented out as they depend on your specific database schema
-- Uncomment and modify as needed based on your actual table structure

/*
-- Clean up orphaned offer codes (if you have a separate codes table)
DELETE FROM public.offer_codes 
WHERE offer_id NOT IN (SELECT id FROM public.offers);

-- Clean up orphaned offer analytics (if you track offer performance)
DELETE FROM public.offer_analytics 
WHERE offer_id NOT IN (SELECT id FROM public.offers);

-- Clean up any notification templates related to offers
DELETE FROM public.notification_templates 
WHERE template_type = 'offer' 
AND reference_id NOT IN (SELECT id FROM public.offers);
*/