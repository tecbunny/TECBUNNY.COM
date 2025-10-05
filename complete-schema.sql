-- =====================================================
-- TECBUNNY E-COMMERCE DATABASE SCHEMA WITH RLS POLICIES
-- COMPLETE SCHEMA WITH ALL 27 TABLES
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUM TYPES
-- =====================================================

-- User roles
CREATE TYPE user_role AS ENUM ('customer', 'sales', 'service_engineer', 'accounts', 'manager', 'admin', 'superadmin');

-- Customer categories
CREATE TYPE customer_category AS ENUM ('Normal', 'Standard', 'Premium');

-- Customer types
CREATE TYPE customer_type AS ENUM ('B2C', 'B2B');

-- B2B categories
CREATE TYPE b2b_category AS ENUM ('Bronze', 'Silver', 'Gold');

-- Order status
CREATE TYPE order_status AS ENUM ('Pending', 'Awaiting Payment', 'Payment Confirmed', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Ready for Pickup', 'Completed', 'Delivered', 'Cancelled', 'Rejected');

-- Order types
CREATE TYPE order_type AS ENUM ('Pickup', 'Delivery', 'Walk-in');

-- Product status
CREATE TYPE product_status AS ENUM ('active', 'archived', 'draft');

-- Stock status
CREATE TYPE stock_status AS ENUM ('in_stock', 'low_stock', 'out_of_stock');

-- Service status
CREATE TYPE service_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Service priority
CREATE TYPE service_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Service category
CREATE TYPE service_category AS ENUM ('Support', 'Protection', 'Installation', 'Trade', 'Business');

-- Service ticket status
CREATE TYPE service_ticket_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'cancelled', 'on_hold');

-- Service ticket priority
CREATE TYPE service_ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Service engineer skill level
CREATE TYPE service_engineer_skill_level AS ENUM ('junior', 'senior', 'expert');

-- Sales agent status
CREATE TYPE sales_agent_status AS ENUM ('pending', 'approved', 'rejected');

-- Redemption status
CREATE TYPE redemption_status AS ENUM ('pending', 'approved', 'rejected', 'processed');

-- Expense status
CREATE TYPE expense_status AS ENUM ('pending', 'approved', 'rejected');

-- Expense category
CREATE TYPE expense_category AS ENUM ('Travel', 'Food', 'Supplies', 'Utility', 'Other');

-- Coupon type
CREATE TYPE coupon_type AS ENUM ('percentage', 'fixed');

-- Coupon status
CREATE TYPE coupon_status AS ENUM ('active', 'inactive');

-- OTP type
CREATE TYPE otp_type AS ENUM ('signup', 'recovery', 'login_2fa', 'agent_order');

-- =====================================================
-- CORE TABLES
-- =====================================================

-- User profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    mobile TEXT,
    role user_role NOT NULL DEFAULT 'customer',
    email_verified BOOLEAN DEFAULT FALSE,
    email_confirmed_at TIMESTAMPTZ,
    address TEXT,
    gstin TEXT,
    customer_category customer_category DEFAULT 'Normal',
    discount_percentage NUMERIC(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    customer_type customer_type DEFAULT 'B2C',
    gst_verified BOOLEAN DEFAULT FALSE,
    gst_verification_date TIMESTAMPTZ,
    business_name TEXT,
    business_address TEXT,
    credit_limit NUMERIC(12,2),
    b2b_category b2b_category,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    name TEXT NOT NULL,
    handle TEXT,
    vendor TEXT,
    product_type TEXT,
    tags TEXT[],
    status product_status DEFAULT 'active',
    images TEXT[],
    seo_title TEXT,
    seo_description TEXT,
    brand TEXT,
    description TEXT NOT NULL,
    mrp NUMERIC(10,2),
    price NUMERIC(10,2) NOT NULL,
    category TEXT NOT NULL,
    image TEXT NOT NULL,
    warranty TEXT,
    hsn_code TEXT,
    gst_rate NUMERIC(5,2),
    is_serial_number_compulsory BOOLEAN DEFAULT FALSE,
    popularity INTEGER DEFAULT 0,
    rating NUMERIC(3,2) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    stock_status stock_status DEFAULT 'in_stock',
    offer_price NUMERIC(10,2),
    discount_percentage NUMERIC(5,2),
    product_url TEXT,
    additional_images TEXT[],
    brand_logo TEXT,
    specifications JSONB,
    model_number TEXT,
    barcode TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product variants
CREATE TABLE public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    price NUMERIC(10,2),
    sku TEXT,
    position INTEGER,
    option1 TEXT,
    option2 TEXT,
    option3 TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product options
CREATE TABLE public.product_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER,
    values TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product pricing rules
CREATE TABLE public.product_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    customer_type customer_type NOT NULL,
    customer_category TEXT,
    price NUMERIC(10,2) NOT NULL,
    min_quantity INTEGER,
    max_quantity INTEGER,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_email TEXT,
    customer_phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status order_status NOT NULL DEFAULT 'Pending',
    subtotal NUMERIC(12,2) NOT NULL,
    gst_amount NUMERIC(12,2) NOT NULL,
    total NUMERIC(12,2) NOT NULL,
    type order_type NOT NULL DEFAULT 'Pickup',
    delivery_address TEXT,
    notes TEXT,
    payment_method TEXT,
    processed_by UUID REFERENCES public.profiles(id),
    payment_confirmed_at TIMESTAMPTZ,
    payment_confirmed_by UUID REFERENCES public.profiles(id),
    confirmed_at TIMESTAMPTZ,
    confirmed_by UUID REFERENCES public.profiles(id),
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES public.profiles(id),
    cancellation_reason TEXT,
    agent_id UUID REFERENCES public.profiles(id),
    commission_applicable BOOLEAN DEFAULT FALSE,
    pre_tax_total NUMERIC(12,2),
    customer_type customer_type DEFAULT 'B2C',
    otp_verified BOOLEAN DEFAULT FALSE,
    otp_verified_at TIMESTAMPTZ
);

-- Order items
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity INTEGER NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    gst_rate NUMERIC(5,2),
    hsn_code TEXT,
    name TEXT NOT NULL,
    serial_numbers TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Order status history
CREATE TABLE public.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    previous_status order_status,
    new_status order_status NOT NULL,
    changed_by UUID REFERENCES public.profiles(id),
    change_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- SERVICES SYSTEM
-- =====================================================

-- Services table
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    icon TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    features TEXT[],
    badge TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    price NUMERIC(10,2),
    duration_days INTEGER,
    category service_category NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Service requests
CREATE TABLE public.service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES public.services(id),
    customer_id UUID REFERENCES public.profiles(id),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    message TEXT,
    status service_status DEFAULT 'pending',
    assigned_to UUID REFERENCES public.profiles(id),
    priority service_priority DEFAULT 'medium',
    scheduled_date TIMESTAMPTZ,
    completed_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Service engineers
CREATE TABLE public.service_engineers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    employee_id TEXT,
    specializations TEXT[],
    skill_level service_engineer_skill_level DEFAULT 'junior',
    available_hours JSONB,
    is_available BOOLEAN DEFAULT TRUE,
    current_location JSONB,
    service_radius INTEGER DEFAULT 50,
    rating NUMERIC(3,2) DEFAULT 0,
    total_services INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Service tickets
CREATE TABLE public.service_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES public.services(id),
    customer_id UUID REFERENCES public.profiles(id),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    customer_address TEXT,
    issue_description TEXT NOT NULL,
    priority service_ticket_priority DEFAULT 'medium',
    status service_ticket_status DEFAULT 'pending',
    assigned_engineer_id UUID REFERENCES public.service_engineers(id),
    assigned_at TIMESTAMPTZ,
    scheduled_date TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    estimated_duration INTEGER,
    actual_duration INTEGER,
    service_charge NUMERIC(10,2),
    parts_cost NUMERIC(10,2),
    total_cost NUMERIC(10,2),
    customer_rating NUMERIC(3,2),
    customer_feedback TEXT,
    engineer_notes TEXT,
    photos TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Service parts
CREATE TABLE public.service_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    part_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost NUMERIC(10,2) NOT NULL,
    total_cost NUMERIC(10,2) NOT NULL,
    warranty_days INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- SALES AGENTS SYSTEM
-- =====================================================

-- Sales agents
CREATE TABLE public.sales_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    referral_code TEXT NOT NULL UNIQUE,
    points_balance NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status sales_agent_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent commissions
CREATE TABLE public.agent_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.sales_agents(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    order_total NUMERIC(12,2) NOT NULL,
    commission_rate_snapshot JSONB NOT NULL,
    points_awarded NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent redemption requests
CREATE TABLE public.agent_redemption_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.sales_agents(id) ON DELETE CASCADE,
    points_to_redeem NUMERIC(10,2) NOT NULL,
    status redemption_status NOT NULL DEFAULT 'pending',
    bank_details JSONB,
    notes TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Agent performance
CREATE TABLE public.agent_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.sales_agents(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL,
    total_orders INTEGER NOT NULL DEFAULT 0,
    total_sales_value NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_commission_earned NUMERIC(10,2) NOT NULL DEFAULT 0,
    customer_acquisition_count INTEGER NOT NULL DEFAULT 0,
    average_order_value NUMERIC(10,2) NOT NULL DEFAULT 0,
    performance_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- SECURITY & AUDIT
-- =====================================================

-- Security settings
CREATE TABLE public.security_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_method TEXT,
    password_last_changed TIMESTAMPTZ,
    login_attempts INTEGER DEFAULT 0,
    account_locked BOOLEAN DEFAULT FALSE,
    account_locked_until TIMESTAMPTZ,
    suspicious_activity_detected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Security audit log
CREATE TABLE public.security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    risk_score INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User MFA status
CREATE TABLE public.user_mfa_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_method TEXT,
    backup_codes TEXT[],
    totp_secret TEXT,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- COMMUNICATION & OTP
-- =====================================================

-- OTP codes
CREATE TABLE public.otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    phone TEXT,
    otp TEXT NOT NULL,
    otp_code TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    type otp_type NOT NULL,
    channel TEXT,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User communication preferences
CREATE TABLE public.user_communication_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    preferred_otp_channel TEXT DEFAULT 'sms',
    sms_notifications BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    whatsapp_notifications BOOLEAN DEFAULT FALSE,
    order_updates BOOLEAN DEFAULT TRUE,
    service_updates BOOLEAN DEFAULT TRUE,
    security_alerts BOOLEAN DEFAULT TRUE,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- SETTINGS & CONFIGURATION
-- =====================================================

-- Application settings
CREATE TABLE public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    category TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    updated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INVENTORY & STOCK
-- =====================================================

-- Stock movements
CREATE TABLE public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id),
    movement_type TEXT NOT NULL, -- 'in', 'out', 'adjustment'
    quantity INTEGER NOT NULL,
    reason TEXT,
    reference_id UUID, -- Order ID, Purchase ID, etc.
    reference_type TEXT,
    performed_by UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- WEBHOOKS & INTEGRATIONS
-- =====================================================

-- Webhook events
CREATE TABLE public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    headers JSONB,
    status TEXT DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    error_message TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- ANALYTICS
-- =====================================================

-- Customer analytics
CREATE TABLE public.customer_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_orders INTEGER NOT NULL DEFAULT 0,
    total_spent NUMERIC(12,2) NOT NULL DEFAULT 0,
    average_order_value NUMERIC(10,2) NOT NULL DEFAULT 0,
    last_order_date TIMESTAMPTZ,
    customer_lifetime_days INTEGER NOT NULL DEFAULT 0,
    preferred_categories TEXT[],
    risk_score NUMERIC(5,2) DEFAULT 0,
    loyalty_score NUMERIC(5,2) DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product analytics
CREATE TABLE public.product_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    total_orders INTEGER NOT NULL DEFAULT 0,
    total_quantity_sold INTEGER NOT NULL DEFAULT 0,
    total_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
    average_rating NUMERIC(3,2) DEFAULT 0,
    return_rate NUMERIC(5,2) DEFAULT 0,
    profit_margin NUMERIC(5,2) DEFAULT 0,
    last_sold_date TIMESTAMPTZ,
    seasonal_trend JSONB,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- OFFERS & COUPONS SYSTEM
-- =====================================================

-- Auto offers table
CREATE TABLE public.auto_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('category_discount', 'customer_tier', 'minimum_order', 'seasonal', 'product_specific')),
    discount_percentage NUMERIC(5,2),
    discount_amount NUMERIC(10,2),
    conditions JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    auto_apply BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0,
    max_discount_amount NUMERIC(10,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Coupons table
CREATE TABLE public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    type coupon_type NOT NULL,
    value NUMERIC(10,2) NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    expiry_date TIMESTAMPTZ NOT NULL,
    min_purchase NUMERIC(10,2),
    usage_limit INTEGER NOT NULL DEFAULT 1,
    usage_count INTEGER NOT NULL DEFAULT 0,
    per_user_limit INTEGER DEFAULT 1,
    status coupon_status NOT NULL DEFAULT 'active',
    applicable_category TEXT,
    applicable_product_id UUID REFERENCES public.products(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- OTP & AUTHENTICATION SYSTEM
-- =====================================================

-- Signup sessions table
CREATE TABLE public.signup_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    mobile TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OTP verifications table (multi-channel OTP)
CREATE TABLE public.otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    purpose TEXT NOT NULL,
    channel TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    user_id UUID REFERENCES public.profiles(id),
    order_id UUID REFERENCES public.orders(id),
    fallback_channels TEXT[],
    last_attempt_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OTP sessions table
CREATE TABLE public.otp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,
    session_id TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_engineers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_redemption_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mfa_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_communication_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signup_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_sessions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'superadmin')
        )
    );

CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'superadmin')
        )
    );

-- Products policies (public read, admin write)
CREATE POLICY "Anyone can view active products" ON public.products
    FOR SELECT USING (status = 'active');

CREATE POLICY "Admins can manage products" ON public.products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'superadmin', 'manager')
        )
    );

-- Product variants and options (same as products)
CREATE POLICY "Anyone can view product variants" ON public.product_variants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.products
            WHERE id = product_id AND status = 'active'
        )
    );

CREATE POLICY "Admins can manage product variants" ON public.product_variants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'superadmin', 'manager')
        )
    );

CREATE POLICY "Anyone can view product options" ON public.product_options
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.products
            WHERE id = product_id AND status = 'active'
        )
    );

CREATE POLICY "Admins can manage product options" ON public.product_options
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'superadmin', 'manager')
        )
    );

-- Orders policies
CREATE POLICY "Users can view their own orders" ON public.orders
    FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Staff can view orders they processed" ON public.orders
    FOR SELECT USING (
        processed_by = auth.uid() OR
        payment_confirmed_by = auth.uid() OR
        confirmed_by = auth.uid() OR
        cancelled_by = auth.uid()
    );

CREATE POLICY "Staff can view all orders" ON public.orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('sales', 'manager', 'admin', 'superadmin', 'accounts')
        )
    );

CREATE POLICY "Staff can update orders" ON public.orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('sales', 'manager', 'admin', 'superadmin', 'accounts')
        )
    );

CREATE POLICY "Users can create orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Order items policies (same access as orders)
CREATE POLICY "Users can view their order items" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE id = order_id AND customer_id = auth.uid()
        )
    );

CREATE POLICY "Staff can view all order items" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('sales', 'manager', 'admin', 'superadmin', 'accounts')
        )
    );

CREATE POLICY "Staff can manage order items" ON public.order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('sales', 'manager', 'admin', 'superadmin', 'accounts')
        )
    );

-- Services policies (public read, admin write)
CREATE POLICY "Anyone can view active services" ON public.services
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage services" ON public.services
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'superadmin', 'manager')
        )
    );

-- Service requests policies
CREATE POLICY "Users can view their service requests" ON public.service_requests
    FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Users can create service requests" ON public.service_requests
    FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Staff can view all service requests" ON public.service_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('sales', 'manager', 'admin', 'superadmin', 'service_engineer')
        )
    );

CREATE POLICY "Staff can update service requests" ON public.service_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('sales', 'manager', 'admin', 'superadmin', 'service_engineer')
        )
    );

-- Service engineers policies
CREATE POLICY "Engineers can view their own profile" ON public.service_engineers
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage service engineers" ON public.service_engineers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'superadmin', 'manager')
        )
    );

-- Service tickets policies
CREATE POLICY "Customers can view their tickets" ON public.service_tickets
    FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Engineers can view assigned tickets" ON public.service_tickets
    FOR SELECT USING (assigned_engineer_id IN (
        SELECT id FROM public.service_engineers WHERE user_id = auth.uid()
    ));

CREATE POLICY "Staff can view all tickets" ON public.service_tickets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('sales', 'manager', 'admin', 'superadmin', 'service_engineer')
        )
    );

CREATE POLICY "Staff can manage tickets" ON public.service_tickets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('sales', 'manager', 'admin', 'superadmin', 'service_engineer')
        )
    );

-- Sales agents policies
CREATE POLICY "Users can apply for sales agent" ON public.sales_agents
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Agents can view their own data" ON public.sales_agents
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage sales agents" ON public.sales_agents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'superadmin')
        )
    );

-- Security settings policies
CREATE POLICY "Users can manage their security settings" ON public.security_settings
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view all security settings" ON public.security_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'superadmin')
        )
    );

-- Security audit log policies (admin only)
CREATE POLICY "Admins can view audit logs" ON public.security_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'superadmin')
        )
    );

CREATE POLICY "System can insert audit logs" ON public.security_audit_log
    FOR INSERT WITH CHECK (true);

-- User MFA status policies
CREATE POLICY "Users can manage their MFA" ON public.user_mfa_status
    FOR ALL USING (user_id = auth.uid());

-- OTP codes policies (service role only for security)
CREATE POLICY "Service can manage OTP codes" ON public.otp_codes
    FOR ALL USING (auth.role() = 'service_role');

-- Communication preferences policies
CREATE POLICY "Users can manage their preferences" ON public.user_communication_preferences
    FOR ALL USING (user_id = auth.uid());

-- Settings policies
CREATE POLICY "Anyone can view public settings" ON public.settings
    FOR SELECT USING (is_public = true);

CREATE POLICY "Admins can manage settings" ON public.settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'superadmin')
        )
    );

-- Stock movements policies
CREATE POLICY "Admins can manage stock movements" ON public.stock_movements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'superadmin', 'manager', 'accounts')
        )
    );

-- Webhook events policies (admin only)
CREATE POLICY "Admins can view webhook events" ON public.webhook_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'superadmin')
        )
    );

CREATE POLICY "Service can manage webhook events" ON public.webhook_events
    FOR ALL USING (auth.role() = 'service_role');

-- Analytics policies (admin and managers only)
CREATE POLICY "Admins can view customer analytics" ON public.customer_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'superadmin', 'manager')
        )
    );

CREATE POLICY "Admins can view product analytics" ON public.product_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'superadmin', 'manager')
        )
    );

-- Auto offers policies (admin only for management, public read for active offers)
CREATE POLICY "Anyone can view active auto offers" ON public.auto_offers
    FOR SELECT USING (is_active = true AND auto_apply = true);

CREATE POLICY "Admins can manage auto offers" ON public.auto_offers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'superadmin', 'manager')
        )
    );

-- Coupons policies (public read for active coupons, admin management)
CREATE POLICY "Anyone can view active coupons" ON public.coupons
    FOR SELECT USING (
        status = 'active' AND
        start_date <= NOW() AND
        expiry_date >= NOW()
    );

CREATE POLICY "Admins can manage coupons" ON public.coupons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'superadmin', 'manager')
        )
    );

-- Signup sessions policies (service role only for security)
CREATE POLICY "Service can manage signup sessions" ON public.signup_sessions
    FOR ALL USING (auth.role() = 'service_role');

-- OTP verifications policies (users can verify their own, service role for management)
CREATE POLICY "Users can verify their own OTP" ON public.otp_verifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own OTP attempts" ON public.otp_verifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Service can manage OTP verifications" ON public.otp_verifications
    FOR ALL USING (auth.role() = 'service_role');

-- OTP sessions policies (service role only)
CREATE POLICY "Service can manage OTP sessions" ON public.otp_sessions
    FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Core indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_service_requests_customer_id ON public.service_requests(customer_id);
CREATE INDEX idx_service_tickets_customer_id ON public.service_tickets(customer_id);
CREATE INDEX idx_service_tickets_status ON public.service_tickets(status);
CREATE INDEX idx_sales_agents_user_id ON public.sales_agents(user_id);
CREATE INDEX idx_security_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX idx_security_audit_log_created_at ON public.security_audit_log(created_at);

-- Additional indexes for missing tables
CREATE INDEX idx_auto_offers_active ON public.auto_offers(is_active, auto_apply, priority);
CREATE INDEX idx_auto_offers_conditions ON public.auto_offers USING gin(conditions);
CREATE INDEX idx_coupons_code ON public.coupons(code);
CREATE INDEX idx_coupons_status_dates ON public.coupons(status, start_date, expiry_date);
CREATE INDEX idx_signup_sessions_email ON public.signup_sessions(email);
CREATE INDEX idx_signup_sessions_expires_at ON public.signup_sessions(expires_at);
CREATE INDEX idx_otp_verifications_user_id ON public.otp_verifications(user_id);
CREATE INDEX idx_otp_verifications_phone ON public.otp_verifications(phone);
CREATE INDEX idx_otp_verifications_email ON public.otp_verifications(email);
CREATE INDEX idx_otp_verifications_expires_at ON public.otp_verifications(expires_at);
CREATE INDEX idx_otp_sessions_identifier ON public.otp_sessions(identifier);
CREATE INDEX idx_otp_sessions_expires_at ON public.otp_sessions(expires_at);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_options_updated_at BEFORE UPDATE ON public.product_options FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_pricing_updated_at BEFORE UPDATE ON public.product_pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_requests_updated_at BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_engineers_updated_at BEFORE UPDATE ON public.service_engineers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_tickets_updated_at BEFORE UPDATE ON public.service_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_agents_updated_at BEFORE UPDATE ON public.sales_agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_security_settings_updated_at BEFORE UPDATE ON public.security_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_mfa_status_updated_at BEFORE UPDATE ON public.user_mfa_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_otp_codes_updated_at BEFORE UPDATE ON public.otp_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_communication_preferences_updated_at BEFORE UPDATE ON public.user_communication_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_auto_offers_updated_at BEFORE UPDATE ON public.auto_offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTIONS AND VIEWS
-- =====================================================

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS user_role AS $$
BEGIN
    RETURN (SELECT role FROM public.profiles WHERE id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION has_permission(user_uuid UUID, required_role user_role)
RETURNS BOOLEAN AS $$
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
    END;

    required_hierarchy := CASE required_role
        WHEN 'customer' THEN 1
        WHEN 'sales' THEN 2
        WHEN 'service_engineer' THEN 2
        WHEN 'accounts' THEN 3
        WHEN 'manager' THEN 4
        WHEN 'admin' THEN 5
        WHEN 'superadmin' THEN 6
    END;

    RETURN role_hierarchy >= required_hierarchy;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for active products with pricing
CREATE VIEW public.active_products_with_pricing AS
SELECT
    p.*,
    COALESCE(pp.price, p.price) as effective_price,
    pp.customer_type,
    pp.customer_category
FROM public.products p
LEFT JOIN public.product_pricing pp ON p.id = pp.product_id
    AND pp.is_active = true
    AND (pp.valid_from IS NULL OR pp.valid_from <= NOW())
    AND (pp.valid_to IS NULL OR pp.valid_to >= NOW())
WHERE p.status = 'active';

-- =====================================================
-- INITIAL DATA SEEDING
-- =====================================================

-- Insert default settings
INSERT INTO public.settings (key, value, description, category, is_public) VALUES
('site_name', '"TecBunny Solutions"', 'Website name', 'general', true),
('site_description', '"Professional electronics and services"', 'Website description', 'general', true),
('contact_email', '"support@tecbunny.com"', 'Contact email', 'contact', true),
('contact_phone', '"1800-XXX-XXXX"', 'Contact phone', 'contact', true),
('gst_rate', '18', 'Default GST rate', 'tax', false),
('commission_rate', '{"B2C": 5, "B2B": 3}', 'Commission rates by customer type', 'commission', false),
('max_order_value', '500000', 'Maximum order value', 'limits', false);

-- Insert default services
INSERT INTO public.services (icon, title, description, features, category, display_order, is_active) VALUES
('Wrench', 'Technical Support', 'Expert technical assistance for all your devices and software needs.', ARRAY['Device Setup', 'Software Installation', 'Troubleshooting', 'Performance Optimization'], 'Support', 1, true),
('Shield', 'Extended Warranty', 'Comprehensive protection plans for your valuable electronics.', ARRAY['Accidental Damage', 'Hardware Failures', 'Software Issues', 'Priority Support'], 'Protection', 2, true),
('Truck', 'Delivery & Installation', 'Professional delivery and setup for your new equipment.', ARRAY['Same-Day Delivery', 'Professional Installation', 'Old Device Removal'], 'Installation', 3, true);

-- Insert default auto offers
INSERT INTO public.auto_offers (title, description, type, discount_percentage, conditions, is_active, auto_apply, priority) VALUES
('Premium Customer Discount', '10% discount for premium customers', 'customer_tier',
 10, '{"customer_category": ["Premium"], "valid_from": "2024-01-01T00:00:00Z", "valid_to": "2025-12-31T23:59:59Z"}',
 true, true, 10),
('Standard Customer Discount', '5% discount for standard customers', 'customer_tier',
 5, '{"customer_category": ["Standard"], "valid_from": "2024-01-01T00:00:00Z", "valid_to": "2025-12-31T23:59:59Z"}',
 true, true, 5),
('Minimum Order Discount', '5% discount for orders over ₹5000', 'minimum_order',
 5, '{"minimum_order_value": 5000, "valid_from": "2024-01-01T00:00:00Z", "valid_to": "2025-12-31T23:59:59Z"}',
 true, true, 3);

-- Insert default coupons
INSERT INTO public.coupons (code, type, value, start_date, expiry_date, usage_limit, per_user_limit, status) VALUES
('WELCOME10', 'percentage', 10, '2024-01-01 00:00:00+00', '2025-12-31 23:59:59+00', 1000, 1, 'active'),
('SAVE500', 'fixed', 500, '2024-01-01 00:00:00+00', '2025-12-31 23:59:59+00', 500, 1, 'active'),
('BULK15', 'percentage', 15, '2024-01-01 00:00:00+00', '2025-12-31 23:59:59+00', 200, 1, 'active');

-- =====================================================
-- END OF SCHEMA
-- =====================================================

-- Note: This schema provides comprehensive RLS policies that ensure:
-- 1. Users can only access their own data
-- 2. Staff roles have appropriate access levels
-- 3. Admins have full access
-- 4. Public data (products, services) is accessible to all
-- 5. Sensitive data (security, audit logs) is restricted to admins
-- 6. Service role has access to system-level operations (OTP, webhooks)