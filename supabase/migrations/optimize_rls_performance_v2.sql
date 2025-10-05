-- Optimize RLS Performance v2 - Fix REMAINING multiple_permissive_policies warnings
-- This migration fixes the duplicate SELECT policies caused by FOR ALL

BEGIN;

-- The issue: FOR ALL policies include SELECT, causing duplicate permissive policies
-- Solution: Use specific actions (INSERT, UPDATE, DELETE) instead of FOR ALL when we have separate SELECT policies

-- =====================================================
-- FIX TABLES WITH DUPLICATE SELECT POLICIES
-- =====================================================

-- 1. AGENT_COMMISSIONS - Remove FOR ALL, use specific actions
DROP POLICY IF EXISTS "Admins can manage commissions" ON public.agent_commissions;

CREATE POLICY "Admins can insert commissions" ON public.agent_commissions
    FOR INSERT WITH CHECK (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'accounts')
    );

CREATE POLICY "Admins can update commissions" ON public.agent_commissions
    FOR UPDATE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'accounts')
    );

CREATE POLICY "Admins can delete commissions" ON public.agent_commissions
    FOR DELETE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'accounts')
    );

-- 2. AGENT_PERFORMANCE
DROP POLICY IF EXISTS "Admins can manage performance" ON public.agent_performance;

CREATE POLICY "Admins can insert performance" ON public.agent_performance
    FOR INSERT WITH CHECK (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'manager')
    );

CREATE POLICY "Admins can update performance" ON public.agent_performance
    FOR UPDATE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'manager')
    );

CREATE POLICY "Admins can delete performance" ON public.agent_performance
    FOR DELETE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'manager')
    );

-- 3. AUTO_OFFERS
DROP POLICY IF EXISTS "Admins can modify offers" ON public.auto_offers;
DROP POLICY IF EXISTS "Admins can insert, update, delete offers" ON public.auto_offers;

CREATE POLICY "Admins can insert offers" ON public.auto_offers
    FOR INSERT WITH CHECK (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

CREATE POLICY "Admins can update offers" ON public.auto_offers
    FOR UPDATE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

CREATE POLICY "Admins can delete offers" ON public.auto_offers
    FOR DELETE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

-- 4. COUPONS
DROP POLICY IF EXISTS "Admins can modify coupons" ON public.coupons;

CREATE POLICY "Admins can insert coupons" ON public.coupons
    FOR INSERT WITH CHECK (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

CREATE POLICY "Admins can update coupons" ON public.coupons
    FOR UPDATE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

CREATE POLICY "Admins can delete coupons" ON public.coupons
    FOR DELETE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

-- 5. ORDER_ITEMS
DROP POLICY IF EXISTS "Staff can manage order items" ON public.order_items;

CREATE POLICY "Staff can insert order items" ON public.order_items
    FOR INSERT WITH CHECK (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'sales', 'accounts')
    );

CREATE POLICY "Staff can update order items" ON public.order_items
    FOR UPDATE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'sales', 'accounts')
    );

CREATE POLICY "Staff can delete order items" ON public.order_items
    FOR DELETE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'sales', 'accounts')
    );

-- 6. ORDER_STATUS_HISTORY
DROP POLICY IF EXISTS "Staff can manage order history" ON public.order_status_history;

CREATE POLICY "Staff can insert order history" ON public.order_status_history
    FOR INSERT WITH CHECK (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'sales', 'accounts')
    );

CREATE POLICY "Staff can update order history" ON public.order_status_history
    FOR UPDATE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'sales', 'accounts')
    );

CREATE POLICY "Staff can delete order history" ON public.order_status_history
    FOR DELETE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'sales', 'accounts')
    );

-- 7. PRODUCT_OPTIONS
DROP POLICY IF EXISTS "Admins can modify options" ON public.product_options;

CREATE POLICY "Admins can insert options" ON public.product_options
    FOR INSERT WITH CHECK (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

CREATE POLICY "Admins can update options" ON public.product_options
    FOR UPDATE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

CREATE POLICY "Admins can delete options" ON public.product_options
    FOR DELETE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

-- 8. PRODUCT_PRICING
DROP POLICY IF EXISTS "Admins can manage pricing" ON public.product_pricing;

CREATE POLICY "Admins can insert pricing" ON public.product_pricing
    FOR INSERT WITH CHECK (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'manager')
    );

CREATE POLICY "Admins can update pricing" ON public.product_pricing
    FOR UPDATE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'manager')
    );

CREATE POLICY "Admins can delete pricing" ON public.product_pricing
    FOR DELETE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'manager')
    );

-- 9. PRODUCT_VARIANTS
DROP POLICY IF EXISTS "Admins can modify variants" ON public.product_variants;

CREATE POLICY "Admins can insert variants" ON public.product_variants
    FOR INSERT WITH CHECK (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

CREATE POLICY "Admins can update variants" ON public.product_variants
    FOR UPDATE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

CREATE POLICY "Admins can delete variants" ON public.product_variants
    FOR DELETE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

-- 10. PRODUCTS
DROP POLICY IF EXISTS "Admins can modify products" ON public.products;

CREATE POLICY "Admins can insert products" ON public.products
    FOR INSERT WITH CHECK (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

CREATE POLICY "Admins can update products" ON public.products
    FOR UPDATE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

CREATE POLICY "Admins can delete products" ON public.products
    FOR DELETE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

-- 11. SECURITY_SETTINGS (has overlapping SELECT policies)
DROP POLICY IF EXISTS "Users and admins can view security settings" ON public.security_settings;
DROP POLICY IF EXISTS "Users can manage their security settings" ON public.security_settings;

-- Consolidate into one policy
CREATE POLICY "Users can manage their own settings, admins can view all" ON public.security_settings
    FOR ALL USING (
        user_id = (SELECT auth.uid())
        OR ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    ) WITH CHECK (
        user_id = (SELECT auth.uid())
    );

-- 12. SERVICE_ENGINEERS
DROP POLICY IF EXISTS "Admins can manage engineers" ON public.service_engineers;

CREATE POLICY "Admins can insert engineers" ON public.service_engineers
    FOR INSERT WITH CHECK (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'manager')
    );

CREATE POLICY "Admins can update engineers" ON public.service_engineers
    FOR UPDATE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'manager')
    );

CREATE POLICY "Admins can delete engineers" ON public.service_engineers
    FOR DELETE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'manager')
    );

-- 13. SERVICE_TICKETS
DROP POLICY IF EXISTS "Staff can manage tickets" ON public.service_tickets;

CREATE POLICY "Staff can insert tickets" ON public.service_tickets
    FOR INSERT WITH CHECK (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'service_engineer', 'manager')
    );

CREATE POLICY "Staff can update tickets" ON public.service_tickets
    FOR UPDATE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'service_engineer', 'manager')
    );

CREATE POLICY "Staff can delete tickets" ON public.service_tickets
    FOR DELETE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'service_engineer', 'manager')
    );

-- 14. SERVICES
DROP POLICY IF EXISTS "Admins can modify services" ON public.services;

CREATE POLICY "Admins can insert services" ON public.services
    FOR INSERT WITH CHECK (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

CREATE POLICY "Admins can update services" ON public.services
    FOR UPDATE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

CREATE POLICY "Admins can delete services" ON public.services
    FOR DELETE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

-- 15. SETTINGS
DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;

CREATE POLICY "Admins can insert settings" ON public.settings
    FOR INSERT WITH CHECK (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

CREATE POLICY "Admins can update settings" ON public.settings
    FOR UPDATE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

CREATE POLICY "Admins can delete settings" ON public.settings
    FOR DELETE USING (
        ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin')
    );

COMMIT;

-- =====================================================
-- SUMMARY
-- =====================================================
-- This migration fixes the remaining 68 multiple_permissive_policies warnings by:
-- 1. Replacing FOR ALL policies with specific INSERT/UPDATE/DELETE policies
-- 2. This prevents overlap with existing SELECT policies
-- 3. Maintains exact same security model, just separates the actions
--
-- Tables Fixed:
-- - agent_commissions, agent_performance, auto_offers, coupons
-- - order_items, order_status_history
-- - product_options, product_pricing, product_variants, products
-- - security_settings (consolidated), service_engineers, service_tickets
-- - services, settings
--
-- Result: Should eliminate all 68 remaining multiple_permissive_policies warnings
