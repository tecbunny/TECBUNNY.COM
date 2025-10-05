-- Add Foreign Key Indexes - Fix unindexed_foreign_keys INFO warnings
-- This migration adds indexes to all foreign key columns for better JOIN performance

BEGIN;

-- =====================================================
-- INDEXES FOR FOREIGN KEY COLUMNS
-- =====================================================

-- 1. AGENT_COMMISSIONS
CREATE INDEX IF NOT EXISTS idx_agent_commissions_agent_id ON public.agent_commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_commissions_order_id ON public.agent_commissions(order_id);

-- 2. AGENT_PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_agent_performance_agent_id ON public.agent_performance(agent_id);

-- 3. AGENT_REDEMPTION_REQUESTS
CREATE INDEX IF NOT EXISTS idx_agent_redemption_requests_agent_id ON public.agent_redemption_requests(agent_id);

-- 4. COUPONS
CREATE INDEX IF NOT EXISTS idx_coupons_applicable_product_id ON public.coupons(applicable_product_id);

-- 5. CUSTOMER_ANALYTICS
CREATE INDEX IF NOT EXISTS idx_customer_analytics_customer_id ON public.customer_analytics(customer_id);

-- 6. ORDER_ITEMS
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- 7. ORDER_STATUS_HISTORY
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_by ON public.order_status_history(changed_by);

-- 8. ORDERS (multiple foreign keys)
CREATE INDEX IF NOT EXISTS idx_orders_processed_by ON public.orders(processed_by);
CREATE INDEX IF NOT EXISTS idx_orders_payment_confirmed_by ON public.orders(payment_confirmed_by);
CREATE INDEX IF NOT EXISTS idx_orders_confirmed_by ON public.orders(confirmed_by);
CREATE INDEX IF NOT EXISTS idx_orders_cancelled_by ON public.orders(cancelled_by);
CREATE INDEX IF NOT EXISTS idx_orders_agent_id ON public.orders(agent_id);

-- 9. OTP_VERIFICATIONS
CREATE INDEX IF NOT EXISTS idx_otp_verifications_order_id ON public.otp_verifications(order_id);

-- 10. PRODUCT_ANALYTICS
CREATE INDEX IF NOT EXISTS idx_product_analytics_product_id ON public.product_analytics(product_id);

-- 11. PRODUCT_OPTIONS
CREATE INDEX IF NOT EXISTS idx_product_options_product_id ON public.product_options(product_id);

-- 12. PRODUCT_PRICING
CREATE INDEX IF NOT EXISTS idx_product_pricing_product_id ON public.product_pricing(product_id);

-- 13. PRODUCT_VARIANTS
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);

-- 14. SECURITY_SETTINGS
CREATE INDEX IF NOT EXISTS idx_security_settings_user_id ON public.security_settings(user_id);

-- 15. SERVICE_ENGINEERS
CREATE INDEX IF NOT EXISTS idx_service_engineers_user_id ON public.service_engineers(user_id);

-- 16. SERVICE_PARTS
CREATE INDEX IF NOT EXISTS idx_service_parts_ticket_id ON public.service_parts(ticket_id);
CREATE INDEX IF NOT EXISTS idx_service_parts_product_id ON public.service_parts(product_id);

-- 17. SERVICE_REQUESTS
CREATE INDEX IF NOT EXISTS idx_service_requests_service_id ON public.service_requests(service_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_assigned_to ON public.service_requests(assigned_to);

-- 18. SERVICE_TICKETS
CREATE INDEX IF NOT EXISTS idx_service_tickets_service_id ON public.service_tickets(service_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_assigned_engineer_id ON public.service_tickets(assigned_engineer_id);

-- 19. SETTINGS
CREATE INDEX IF NOT EXISTS idx_settings_updated_by ON public.settings(updated_by);

-- 20. STOCK_MOVEMENTS
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_performed_by ON public.stock_movements(performed_by);

-- 21. USER_COMMUNICATION_PREFERENCES
CREATE INDEX IF NOT EXISTS idx_user_communication_preferences_user_id ON public.user_communication_preferences(user_id);

-- 22. USER_MFA_STATUS
CREATE INDEX IF NOT EXISTS idx_user_mfa_status_user_id ON public.user_mfa_status(user_id);

COMMIT;

-- =====================================================
-- SUMMARY
-- =====================================================
-- This migration:
-- 1. Adds 33 indexes for foreign key columns
-- 2. Improves JOIN performance on related tables
-- 3. Eliminates all unindexed_foreign_keys INFO warnings
--
-- Performance Impact:
-- - Faster JOINs on foreign key relationships
-- - Better query performance for lookups by foreign key
-- - Slight increase in INSERT/UPDATE/DELETE time (minimal)
-- - Increased storage usage (indexes require disk space)
--
-- These indexes are particularly beneficial for:
-- - Order-related queries (orders, order_items, order_status_history)
-- - Product relationships (product_variants, product_options, product_pricing)
-- - Service ticket lookups (service_tickets, service_requests, service_parts)
-- - Agent commission calculations (agent_commissions, agent_performance)
