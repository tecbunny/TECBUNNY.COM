-- =============================================
-- Clear All Products Script
-- Removes all products from the products table
-- WARNING: This will delete ALL product data!
-- =============================================

BEGIN;

-- Disable foreign key checks temporarily by deleting dependent records first
-- (Adjust based on your actual foreign key relationships)

-- Clear product-related data in dependent tables
DELETE FROM public.order_items WHERE product_id IN (SELECT id FROM public.products);
DELETE FROM public.purchase_items WHERE product_id IN (SELECT id FROM public.products);
DELETE FROM public.product_variants WHERE product_id IN (SELECT id FROM public.products);
DELETE FROM public.product_options WHERE product_id IN (SELECT id FROM public.products);
DELETE FROM public.reviews WHERE product_id IN (SELECT id FROM public.products);
DELETE FROM public.inventory_items WHERE product_id IN (SELECT id FROM public.products);
DELETE FROM public.product_pricing WHERE product_id IN (SELECT id FROM public.products);
DELETE FROM public.product_analytics WHERE product_id IN (SELECT id FROM public.products);
DELETE FROM public.agent_commission_rules WHERE product_id IN (SELECT id FROM public.products);
DELETE FROM public.service_parts WHERE product_id IN (SELECT id FROM public.products);

-- Clear coupons and discounts that might reference specific products
UPDATE public.coupons SET applicable_product_id = NULL WHERE applicable_product_id IS NOT NULL;
UPDATE public.discounts SET applicable_product_id = NULL WHERE applicable_product_id IS NOT NULL;

-- Now delete all products
DELETE FROM public.products;

-- Reset the sequence if it exists (handle different possible sequence names)
DO $$
BEGIN
    -- Try common sequence naming patterns
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'products_id_seq') THEN
        PERFORM setval('products_id_seq', 1, false);
    ELSIF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'products_seq') THEN
        PERFORM setval('products_seq', 1, false);
    ELSIF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename LIKE '%products%id%seq') THEN
        -- Find and reset any sequence with 'products' and 'id' and 'seq' in the name
        PERFORM setval(sequencename, 1, false) 
        FROM pg_sequences 
        WHERE schemaname = 'public' AND sequencename LIKE '%products%id%seq'
        LIMIT 1;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- If sequence operations fail, just continue
        RAISE NOTICE 'Sequence reset skipped: %', SQLERRM;
END $$;

COMMIT;

-- Display success message
SELECT 'All products cleared successfully!' as message;
SELECT COUNT(*) as remaining_products FROM public.products;