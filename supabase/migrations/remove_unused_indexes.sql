-- Remove Unused Indexes - Fix unused_index INFO warnings
-- CAUTION: Only run this if you're confident these indexes won't be needed
-- These indexes haven't been used YET, but may be useful as the application grows

BEGIN;

-- =====================================================
-- REMOVE UNUSED INDEXES
-- =====================================================
-- Note: These are currently unused but may become useful with more data/queries
-- Review each index before dropping to ensure it won't be needed

-- PROFILES table (3 unused indexes)
DROP INDEX IF EXISTS public.idx_profiles_email;           -- Email lookups (may be needed for search)
DROP INDEX IF EXISTS public.idx_profiles_role;            -- Role filtering (may be needed for admin panels)
DROP INDEX IF EXISTS public.idx_profiles_zoho_crm_id;     -- Zoho CRM integration (keep if using Zoho)

-- PRODUCTS table (2 unused indexes)
DROP INDEX IF EXISTS public.idx_products_category;        -- Category filtering (likely needed soon)
DROP INDEX IF EXISTS public.idx_products_zoho_item_id;    -- Zoho integration (keep if using Zoho)

-- ORDERS table (4 unused indexes)
DROP INDEX IF EXISTS public.idx_orders_status;            -- Status filtering (likely needed)
DROP INDEX IF EXISTS public.idx_orders_created_at;        -- Date range queries (likely needed)
DROP INDEX IF EXISTS public.idx_orders_zoho_order_id;     -- Zoho integration (keep if using Zoho)
DROP INDEX IF EXISTS public.idx_orders_zoho_deal_id;      -- Zoho integration (keep if using Zoho)

-- ORDER_ITEMS table (1 unused index)
DROP INDEX IF EXISTS public.idx_order_items_order_id;     -- Already covered by foreign key index

-- SERVICE_TICKETS table (1 unused index)
DROP INDEX IF EXISTS public.idx_service_tickets_status;   -- Status filtering (likely needed soon)

-- SECURITY_AUDIT_LOG table (1 unused index)
DROP INDEX IF EXISTS public.idx_security_audit_log_created_at;  -- Date range queries (keep for compliance)

-- AUTO_OFFERS table (2 unused indexes)
DROP INDEX IF EXISTS public.idx_auto_offers_active;       -- Active offers filtering (likely needed)
DROP INDEX IF EXISTS public.idx_auto_offers_conditions;   -- Conditions lookup (may be needed)

-- COUPONS table (2 unused indexes)
DROP INDEX IF EXISTS public.idx_coupons_code;             -- Coupon code lookup (KEEP THIS - essential)
DROP INDEX IF EXISTS public.idx_coupons_status_dates;     -- Status/date filtering (likely needed)

-- SIGNUP_SESSIONS table (2 unused indexes)
DROP INDEX IF EXISTS public.idx_signup_sessions_email;    -- Email lookup during signup (KEEP THIS)
DROP INDEX IF EXISTS public.idx_signup_sessions_expires_at;  -- Cleanup expired sessions (useful)

-- OTP_VERIFICATIONS table (3 unused indexes)
DROP INDEX IF EXISTS public.idx_otp_verifications_phone;     -- Phone OTP lookup (KEEP THIS - essential)
DROP INDEX IF EXISTS public.idx_otp_verifications_email;     -- Email OTP lookup (KEEP THIS - essential)
DROP INDEX IF EXISTS public.idx_otp_verifications_expires_at;  -- Cleanup expired OTPs (useful)

-- OTP_SESSIONS table (2 unused indexes)
DROP INDEX IF EXISTS public.idx_otp_sessions_identifier;     -- Session lookup (KEEP THIS - essential)
DROP INDEX IF EXISTS public.idx_otp_sessions_expires_at;     -- Cleanup expired sessions (useful)

-- ZOHO_SYNC_LOGS table (1 unused index)
DROP INDEX IF EXISTS public.idx_zoho_sync_logs_created_at;   -- Date range queries (keep if using Zoho)

COMMIT;

-- =====================================================
-- RECOMMENDATION: DO NOT RUN THIS MIGRATION
-- =====================================================
-- Most of these "unused" indexes are likely to be used once:
-- 1. You have more data in the database
-- 2. More users are actively using the application
-- 3. Admin panels and reports are built out
-- 4. Integration features (Zoho) are activated
--
-- Indexes to DEFINITELY KEEP (even if unused now):
-- - idx_coupons_code (essential for coupon validation)
-- - idx_signup_sessions_email (essential for signup flow)
-- - idx_otp_verifications_phone (essential for OTP verification)
-- - idx_otp_verifications_email (essential for OTP verification)
-- - idx_otp_sessions_identifier (essential for session management)
-- - idx_orders_status (will be needed for order filtering)
-- - idx_orders_created_at (will be needed for date range queries)
-- - idx_products_category (will be needed for category browsing)
--
-- Indexes safe to drop (if not using Zoho):
-- - idx_profiles_zoho_crm_id
-- - idx_products_zoho_item_id
-- - idx_orders_zoho_order_id
-- - idx_orders_zoho_deal_id
-- - idx_zoho_sync_logs_created_at
--
-- Impact of keeping unused indexes:
-- - Minimal storage cost (~1-5MB per index for small tables)
-- - Slight performance hit on INSERT/UPDATE/DELETE (negligible)
-- - Future-proof for when these queries ARE needed
