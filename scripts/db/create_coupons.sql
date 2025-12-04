-- =============================================
-- Create Sample Coupons Script
-- Adds sample coupons to the coupons table
-- =============================================

BEGIN;

-- Insert sample coupons
INSERT INTO public.coupons (
  code,
  title,
  description,
  discount_type,
  discount_value,
  min_order_amount,
  max_discount_amount,
  usage_limit,
  usage_count,
  user_usage_limit,
  start_date,
  end_date,
  is_active,
  is_public,
  applicable_categories,
  applicable_products,
  terms_conditions,
  created_at
) VALUES 
-- Welcome Coupons
(
  'WELCOME2024',
  'Welcome New Customer',
  'Welcome to TecBunny! Get 10% off on your first purchase. Valid for new customers only.',
  'percentage',
  10.00,
  5000.00,
  2000.00,
  1000,
  0,
  1,
  '2024-01-01',
  '2024-12-31',
  true,
  true,
  ARRAY['Laptops', 'Desktops', 'Accessories'],
  NULL,
  ARRAY[
    'Valid for first-time customers only',
    'Cannot be combined with other offers',
    'Minimum order value ₹5,000',
    'Maximum discount ₹2,000',
    'One-time use per customer'
  ],
  NOW()
),

-- Percentage Discount Coupons
(
  'SAVE15NOW',
  'Save 15% Today',
  'Get instant 15% discount on all laptop purchases. Limited time offer for our valued customers.',
  'percentage',
  15.00,
  25000.00,
  7500.00,
  500,
  0,
  3,
  NOW(),
  NOW() + INTERVAL '30 days',
  true,
  true,
  ARRAY['Laptops'],
  NULL,
  ARRAY[
    'Valid for 30 days from today',
    'Applicable on laptops only',
    'Minimum purchase ₹25,000',
    'Maximum discount ₹7,500',
    'Can be used 3 times per customer'
  ],
  NOW()
),

(
  'TECH20OFF',
  'Tech Enthusiast Discount',
  '20% off on gaming laptops and high-performance desktops. Perfect for tech enthusiasts and gamers.',
  'percentage',
  20.00,
  40000.00,
  15000.00,
  200,
  0,
  2,
  '2024-11-15',
  '2024-12-15',
  true,
  false,
  ARRAY['Gaming Laptops', 'Desktops'],
  NULL,
  ARRAY[
    'Valid from November 15 to December 15, 2024',
    'Gaming laptops and desktops only',
    'Minimum order ₹40,000',
    'Maximum savings ₹15,000',
    'Limited to 2 uses per customer'
  ],
  NOW()
),

-- Fixed Amount Coupons
(
  'FLAT3000',
  'Flat ₹3000 Off',
  'Get flat ₹3,000 discount on any purchase above ₹30,000. No maximum limit, just pure savings!',
  'fixed',
  3000.00,
  30000.00,
  3000.00,
  300,
  0,
  1,
  '2024-11-01',
  '2024-12-31',
  true,
  true,
  NULL,
  NULL,
  ARRAY[
    'Flat ₹3,000 discount',
    'Minimum purchase ₹30,000',
    'Valid till December 31, 2024',
    'One-time use per customer',
    'Applicable on all products'
  ],
  NOW()
),

(
  'MEGA5K',
  'Mega Save ₹5000',
  'Huge savings of ₹5,000 on orders above ₹50,000. Perfect for bulk purchases and complete setups.',
  'fixed',
  5000.00,
  50000.00,
  5000.00,
  100,
  0,
  1,
  '2024-11-20',
  '2025-01-20',
  true,
  true,
  NULL,
  NULL,
  ARRAY[
    'Fixed ₹5,000 discount',
    'Minimum order ₹50,000',
    'Valid for 60 days',
    'One use per customer',
    'Cannot be combined with other coupons'
  ],
  NOW()
),

-- Category-Specific Coupons
(
  'MONITOR25',
  'Monitor Madness',
  '25% off on all monitors and display accessories. Upgrade your visual experience today!',
  'percentage',
  25.00,
  10000.00,
  8000.00,
  150,
  0,
  2,
  '2024-11-10',
  '2024-12-10',
  true,
  true,
  ARRAY['Monitors'],
  NULL,
  ARRAY[
    'Monitors and display accessories only',
    '25% discount up to ₹8,000',
    'Minimum purchase ₹10,000',
    'Valid for 30 days',
    'Can be used twice per customer'
  ],
  NOW()
),

(
  'AUDIO30',
  'Audio Equipment Special',
  'Premium audio experience with 30% off on headphones, speakers, and audio accessories.',
  'percentage',
  30.00,
  5000.00,
  5000.00,
  250,
  0,
  3,
  NOW(),
  NOW() + INTERVAL '45 days',
  true,
  true,
  ARRAY['Audio'],
  NULL,
  ARRAY[
    'Audio equipment only',
    '30% off up to ₹5,000',
    'Minimum order ₹5,000',
    'Valid for 45 days',
    'Maximum 3 uses per customer'
  ],
  NOW()
),

-- VIP/Premium Customer Coupons
(
  'VIP2024',
  'VIP Customer Exclusive',
  'Exclusive coupon for our VIP customers. Get 12% off on any purchase with no minimum order value.',
  'percentage',
  12.00,
  0.00,
  10000.00,
  50,
  0,
  5,
  '2024-01-01',
  '2024-12-31',
  true,
  false,
  NULL,
  NULL,
  ARRAY[
    'VIP customers only',
    'No minimum order value',
    '12% discount up to ₹10,000',
    'Valid throughout 2024',
    'Can be used 5 times'
  ],
  NOW()
),

-- Festival Special Coupons
(
  'DIWALI2024',
  'Diwali Special Celebration',
  'Celebrate Diwali with special 22% discount on all products. Festival of lights, festival of savings!',
  'percentage',
  22.00,
  15000.00,
  12000.00,
  400,
  0,
  2,
  '2024-10-25',
  '2024-11-15',
  true,
  true,
  NULL,
  NULL,
  ARRAY[
    'Diwali special discount',
    '22% off on all products',
    'Minimum purchase ₹15,000',
    'Maximum discount ₹12,000',
    'Valid during Diwali season'
  ],
  NOW()
),

-- Limited Time Flash Coupons
(
  'FLASH48',
  'Flash Sale 48 Hours',
  'Super flash coupon valid for 48 hours only! Get 18% off with no questions asked.',
  'percentage',
  18.00,
  8000.00,
  6000.00,
  75,
  0,
  1,
  NOW(),
  NOW() + INTERVAL '2 days',
  true,
  true,
  NULL,
  NULL,
  ARRAY[
    'Valid for 48 hours only',
    '18% discount up to ₹6,000',
    'Minimum order ₹8,000',
    'One-time use only',
    'First come, first served'
  ],
  NOW()
),

-- Bulk Order Coupons
(
  'BULK10K',
  'Bulk Order Special',
  'Special pricing for bulk orders. Get ₹10,000 off on orders above ₹1,00,000. Perfect for businesses.',
  'fixed',
  10000.00,
  100000.00,
  10000.00,
  25,
  0,
  1,
  '2024-11-01',
  '2025-02-28',
  true,
  false,
  NULL,
  NULL,
  ARRAY[
    'Bulk order discount ₹10,000',
    'Minimum order ₹1,00,000',
    'Valid for 4 months',
    'Business customers preferred',
    'Invoice required for verification'
  ],
  NOW()
),

-- Service Coupons
(
  'FREESERVICE',
  'Complimentary Service',
  'Free installation and setup service worth ₹2,500 with any desktop purchase above ₹35,000.',
  'service',
  2500.00,
  35000.00,
  2500.00,
  100,
  0,
  1,
  '2024-11-01',
  '2024-12-31',
  true,
  true,
  ARRAY['Desktops'],
  NULL,
  ARRAY[
    'Free service worth ₹2,500',
    'Desktop purchase above ₹35,000',
    'Installation and setup included',
    'Service within 7 days of purchase',
    'Valid till December 31, 2024'
  ],
  NOW()
);

-- Update sequences if they exist
DO $$
BEGIN
    -- Try to update sequence based on current max ID
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'coupons_id_seq') THEN
        PERFORM setval('coupons_id_seq', (SELECT COALESCE(MAX(id), 1) FROM coupons));
    ELSIF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'coupons_seq') THEN
        PERFORM setval('coupons_seq', (SELECT COALESCE(MAX(id), 1) FROM coupons));
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Coupons sequence update skipped: %', SQLERRM;
END $$;

COMMIT;

-- Display success message
SELECT 'Sample coupons created successfully!' as message;
SELECT COUNT(*) as total_coupons FROM public.coupons;
SELECT 
    discount_type,
    COUNT(*) as count
FROM public.coupons 
GROUP BY discount_type;