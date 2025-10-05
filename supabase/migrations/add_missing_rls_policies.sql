-- Add RLS policies for tables with RLS enabled but no policies
-- These are INFO level warnings - tables are secure but inaccessible

BEGIN;

-- =====================================================
-- 1. agent_commissions - Sales agents can view their own, admins can manage all
-- =====================================================

CREATE POLICY "Users can view own commissions" ON public.agent_commissions
    FOR SELECT USING (
        agent_id = auth.uid()
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'accounts')
    );

CREATE POLICY "Admins can manage commissions" ON public.agent_commissions
    FOR ALL USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'accounts')
    );

-- =====================================================
-- 2. agent_performance - Sales agents can view their own, admins can manage all
-- =====================================================

CREATE POLICY "Users can view own performance" ON public.agent_performance
    FOR SELECT USING (
        agent_id = auth.uid()
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'manager')
    );

CREATE POLICY "Admins can manage performance" ON public.agent_performance
    FOR ALL USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'manager')
    );

-- =====================================================
-- 3. agent_redemption_requests - Agents can manage their own, admins can manage all
-- =====================================================

CREATE POLICY "Users can manage own redemptions" ON public.agent_redemption_requests
    FOR ALL USING (
        agent_id = auth.uid()
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'accounts')
    );

-- =====================================================
-- 4. order_status_history - Users can view their orders, admins can manage all
-- =====================================================

CREATE POLICY "Users can view own order history" ON public.order_status_history
    FOR SELECT USING (
        order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid())
        OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'sales', 'accounts')
    );

CREATE POLICY "Admins can manage order history" ON public.order_status_history
    FOR ALL USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'sales', 'accounts')
    );

-- =====================================================
-- 5. product_pricing - Public can read, admins can manage
-- =====================================================

CREATE POLICY "Anyone can view product pricing" ON public.product_pricing
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage product pricing" ON public.product_pricing
    FOR ALL USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'manager')
    );

-- =====================================================
-- 6. service_parts - Service engineers and admins can manage
-- =====================================================

CREATE POLICY "Service staff can manage parts" ON public.service_parts
    FOR ALL USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'superadmin', 'service_engineer', 'manager')
    );

COMMIT;
