-- =====================================================
-- CREATE PAGE_CONTENT TABLE FOR POLICIES MANAGEMENT
-- =====================================================

-- Create page_content table for storing policies and other page content
CREATE TABLE IF NOT EXISTS public.page_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content JSONB NOT NULL,
    meta_description TEXT,
    meta_keywords TEXT,
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.page_content ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Anyone can view published page content
CREATE POLICY "Anyone can view published page content" ON public.page_content
    FOR SELECT
    USING (status = 'published');

-- Admins can view all page content
CREATE POLICY "Admins can view all page content" ON public.page_content
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

-- Admins can insert page content
CREATE POLICY "Admins can insert page content" ON public.page_content
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

-- Admins can update page content
CREATE POLICY "Admins can update page content" ON public.page_content
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

-- Admins can delete page content
CREATE POLICY "Admins can delete page content" ON public.page_content
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
CREATE INDEX IF NOT EXISTS idx_page_content_key ON public.page_content(page_key);
CREATE INDEX IF NOT EXISTS idx_page_content_status ON public.page_content(status);

-- Create trigger for updated_at
CREATE TRIGGER update_page_content_updated_at 
    BEFORE UPDATE ON public.page_content 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default policy pages
INSERT INTO public.page_content (page_key, title, content, meta_description, status) VALUES
(
    'privacy_policy',
    'Privacy Policy',
    '{"title": "Privacy Policy", "lastUpdated": "2025-10-04", "introduction": ["Welcome to TecBunny Solutions. We respect your privacy and are committed to protecting your personal data."], "sections": [{"title": "Information We Collect", "content": ["We collect information you provide directly to us, including name, email, phone number, and payment details."]}, {"title": "How We Use Your Information", "content": ["We use your information to process orders, improve our services, and communicate with you about your purchases."]}, {"title": "Data Security", "content": ["We implement appropriate security measures to protect your personal information from unauthorized access."]}, {"title": "Contact Us", "content": ["If you have questions about this Privacy Policy, please contact us at support@tecbunny.com"]}]}',
    'Learn how TecBunny Solutions collects, uses, and protects your personal information.',
    'published'
),
(
    'terms_of_service',
    'Terms of Service',
    '{"title": "Terms of Service", "lastUpdated": "2025-10-04", "introduction": ["Welcome to TecBunny Solutions. By using our services, you agree to these terms."], "sections": [{"title": "Use of Services", "content": ["You must be at least 18 years old to use our services. You agree to provide accurate information."]}, {"title": "Orders and Payments", "content": ["All orders are subject to acceptance and availability. Prices are subject to change without notice."]}, {"title": "Intellectual Property", "content": ["All content on this website is owned by TecBunny Solutions and protected by copyright laws."]}, {"title": "Limitation of Liability", "content": ["TecBunny Solutions shall not be liable for any indirect, incidental, or consequential damages."]}]}',
    'Terms and conditions for using TecBunny Solutions services and platform.',
    'published'
),
(
    'shipping_policy',
    'Shipping Policy',
    '{"title": "Shipping Policy", "lastUpdated": "2025-10-04", "introduction": ["We offer reliable shipping services across India with multiple delivery options."], "sections": [{"title": "Shipping Methods", "content": ["We offer standard shipping (5-7 business days) and express shipping (2-3 business days)."]}, {"title": "Shipping Costs", "content": ["Shipping costs vary based on order value and delivery location. Free shipping on orders above ₹500."]}, {"title": "Delivery Time", "content": ["Delivery times are estimates and may vary based on location and product availability."]}, {"title": "Tracking", "content": ["You will receive tracking information via email once your order is shipped."]}]}',
    'Information about shipping methods, costs, and delivery times for TecBunny Solutions.',
    'published'
),
(
    'return_policy',
    'Return & Exchange Policy',
    '{"title": "Return & Exchange Policy", "lastUpdated": "2025-10-04", "introduction": ["We want you to be completely satisfied with your purchase. If not, we offer easy returns and exchanges."], "sections": [{"title": "Return Period", "content": ["You can return products within 7 days of delivery for a full refund or exchange."]}, {"title": "Conditions for Returns", "content": ["Products must be unused, in original packaging, and with all tags attached.", "Certain items like software and customized products cannot be returned."]}, {"title": "Return Process", "list": ["Contact our support team at support@tecbunny.com", "Pack the item securely in its original packaging", "Ship the item using our prepaid return label", "Refund will be processed within 5-7 business days"]}, {"title": "Exchanges", "content": ["If you want to exchange a product, contact us and we will arrange pickup and delivery of the replacement."]}]}',
    'Guidelines for returns, exchanges, and refunds at TecBunny Solutions.',
    'published'
)
ON CONFLICT (page_key) DO NOTHING;

-- Grant permissions
GRANT SELECT ON public.page_content TO anon, authenticated;
GRANT ALL ON public.page_content TO service_role;
