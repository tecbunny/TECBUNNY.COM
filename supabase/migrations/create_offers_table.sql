-- =====================================================
-- CREATE OFFERS TABLE FOR OFFERS MANAGEMENT
-- =====================================================

-- Create offers table (different from auto_offers)
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping')),
    discount_value NUMERIC(10,2),
    minimum_purchase_amount NUMERIC(10,2),
    maximum_discount_amount NUMERIC(10,2),
    offer_code TEXT UNIQUE,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    usage_limit_per_customer INTEGER,
    customer_eligibility TEXT DEFAULT 'all' CHECK (customer_eligibility IN ('all', 'new_customers', 'existing_customers', 'vip_customers')),
    priority INTEGER DEFAULT 0,
    display_on_homepage BOOLEAN DEFAULT FALSE,
    banner_text TEXT,
    banner_color TEXT DEFAULT '#dc2626',
    terms_and_conditions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Anyone can view active offers
CREATE POLICY "Anyone can view active offers" ON public.offers
    FOR SELECT
    USING (is_active = true AND end_date >= NOW());

-- Admins can view all offers
CREATE POLICY "Admins can view all offers" ON public.offers
    FOR SELECT
    USING (
        auth.jwt() ->> 'role' = 'admin' OR 
        auth.jwt() ->> 'role' = 'superadmin' OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    );

-- Admins can insert offers
CREATE POLICY "Admins can insert offers" ON public.offers
    FOR INSERT
    WITH CHECK (
        auth.jwt() ->> 'role' = 'admin' OR 
        auth.jwt() ->> 'role' = 'superadmin' OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    );

-- Admins can update offers
CREATE POLICY "Admins can update offers" ON public.offers
    FOR UPDATE
    USING (
        auth.jwt() ->> 'role' = 'admin' OR 
        auth.jwt() ->> 'role' = 'superadmin' OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    );

-- Admins can delete offers
CREATE POLICY "Admins can delete offers" ON public.offers
    FOR DELETE
    USING (
        auth.jwt() ->> 'role' = 'admin' OR 
        auth.jwt() ->> 'role' = 'superadmin' OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'superadmin')
        )
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_offers_active ON public.offers(is_active, end_date);
CREATE INDEX IF NOT EXISTS idx_offers_featured ON public.offers(is_featured);
CREATE INDEX IF NOT EXISTS idx_offers_homepage ON public.offers(display_on_homepage);
CREATE INDEX IF NOT EXISTS idx_offers_dates ON public.offers(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_offers_code ON public.offers(offer_code);
CREATE INDEX IF NOT EXISTS idx_offers_priority ON public.offers(priority DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_offers_updated_at 
    BEFORE UPDATE ON public.offers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample offers (optional)
INSERT INTO public.offers (
    title, 
    description, 
    discount_type, 
    discount_value, 
    start_date, 
    end_date, 
    is_active, 
    is_featured,
    display_on_homepage,
    banner_text,
    customer_eligibility,
    priority
) VALUES
(
    'Welcome Offer - 10% Off',
    'Get 10% off on your first purchase',
    'percentage',
    10,
    NOW(),
    NOW() + INTERVAL '30 days',
    true,
    true,
    true,
    '🎉 Welcome! Get 10% off your first order',
    'new_customers',
    10
),
(
    'Free Shipping',
    'Free shipping on orders above ₹500',
    'free_shipping',
    0,
    NOW(),
    NOW() + INTERVAL '90 days',
    true,
    false,
    true,
    '🚚 Free shipping on orders ₹500+',
    'all',
    5
)
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT SELECT ON public.offers TO anon, authenticated;
GRANT ALL ON public.offers TO service_role;
