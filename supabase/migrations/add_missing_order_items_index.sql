-- Add missing order_items.order_id index
-- This index was missed in the initial foreign key indexes migration

BEGIN;

-- Add index for order_items.order_id foreign key
-- This is critical for ORDER -> ORDER_ITEMS JOIN queries
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

COMMIT;

-- =====================================================
-- SUMMARY
-- =====================================================
-- This migration adds the missing index for order_items.order_id
-- 
-- Performance Impact:
-- - Faster JOINs when querying orders with their items
-- - Improved performance for "Get order details" queries
-- - Essential for order management UI
--
-- This completes all unindexed foreign key warnings!
