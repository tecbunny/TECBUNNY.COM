-- =============================================
-- Create Sample Offers Script
-- Adds sample offers to the offers table
-- =============================================

BEGIN;

-- Insert sample offers
INSERT INTO public.offers (
  title,
  description,
  discount_percentage,
  discount_amount,
  offer_type,
  start_date,
  end_date,
  min_order_amount,
  max_discount_amount,
  usage_limit,
  usage_count,
  terms_conditions,
  is_active,
  is_featured,
  applicable_categories,
  banner_image,
  created_at
) VALUES 
-- Seasonal Offers
(
  'Diwali Mega Sale 2024',
  'Celebrate Diwali with amazing discounts up to 40% off on laptops, desktops, and gaming accessories. Limited time offer!',
  25.00,
  NULL,
  'percentage',
  '2024-11-01',
  '2024-11-15',
  15000.00,
  20000.00,
  1000,
  0,
  ARRAY[
    'Valid till November 15, 2024',
    'Cannot be combined with other offers',
    'Minimum order value ₹15,000',
    'Maximum discount ₹20,000',
    'Applicable on select categories only'
  ],
  true,
  true,
  ARRAY['Laptops', 'Desktops', 'Accessories'],
  'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=800',
  NOW()
),

(
  'New Year Tech Bonanza',
  'Start the new year with cutting-edge technology! Get 30% off on all monitors and audio equipment.',
  30.00,
  NULL,
  'percentage',
  '2024-12-25',
  '2025-01-10',
  8000.00,
  15000.00,
  500,
  0,
  ARRAY[
    'Valid from December 25, 2024 to January 10, 2025',
    'Applicable on monitors and audio equipment only',
    'Minimum purchase ₹8,000',
    'Maximum discount ₹15,000',
    'One offer per customer'
  ],
  true,
  true,
  ARRAY['Monitors', 'Audio'],
  'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800',
  NOW()
),

-- Product Category Offers
(
  'Gaming Week Special',
  'Level up your gaming setup! Exclusive discounts on gaming laptops, keyboards, mice, and headphones.',
  20.00,
  NULL,
  'percentage',
  '2024-11-20',
  '2024-11-27',
  12000.00,
  25000.00,
  300,
  0,
  ARRAY[
    'Gaming Week Special Offer',
    'Valid from November 20-27, 2024',
    'Applicable on gaming products only',
    'Minimum order ₹12,000',
    'Free shipping included'
  ],
  true,
  false,
  ARRAY['Gaming Laptops', 'Keyboards', 'Audio', 'Accessories'],
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800',
  NOW()
),

-- Fixed Amount Offers
(
  'Flat ₹5000 Off on Workstations',
  'Professional workstation computers with flat ₹5,000 discount. Perfect for businesses and professionals.',
  NULL,
  5000.00,
  'fixed',
  '2024-11-15',
  '2024-12-15',
  50000.00,
  5000.00,
  100,
  0,
  ARRAY[
    'Flat ₹5,000 discount on workstations',
    'Minimum order value ₹50,000',
    'Valid for 30 days',
    'Applicable on workstation category only',
    'Corporate discounts available'
  ],
  true,
  false,
  ARRAY['Workstations', 'Desktops'],
  'https://images.unsplash.com/photo-1518756131217-31eb79b20e8f?w=800',
  NOW()
),

-- Service Offers
(
  'Free Setup & Installation',
  'Get free setup and installation service with every desktop PC purchase above ₹40,000. Save ₹3,500!',
  NULL,
  3500.00,
  'service',
  '2024-11-01',
  '2024-12-31',
  40000.00,
  3500.00,
  200,
  0,
  ARRAY[
    'Free setup service worth ₹3,500',
    'Valid with desktop PC purchase above ₹40,000',
    'Service must be availed within 7 days of purchase',
    'Includes OS installation and basic setup',
    'Valid till December 31, 2024'
  ],
  true,
  true,
  ARRAY['Desktops', 'Workstations'],
  'https://images.unsplash.com/photo-1581092918484-8313e1f6e049?w=800',
  NOW()
),

-- Bundle Offers
(
  'Complete Setup Bundle Deal',
  'Buy any laptop + monitor + keyboard combo and save 15% on the total bill. Perfect productivity bundle!',
  15.00,
  NULL,
  'bundle',
  '2024-11-10',
  '2024-12-10',
  25000.00,
  10000.00,
  150,
  0,
  ARRAY[
    '15% off on laptop + monitor + keyboard bundle',
    'All three items must be purchased together',
    'Minimum bundle value ₹25,000',
    'Maximum savings ₹10,000',
    'Choose from selected models only'
  ],
  true,
  false,
  ARRAY['Laptops', 'Monitors', 'Keyboards'],
  'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800',
  NOW()
),

-- Flash Sale
(
  'Flash Sale - 48 Hours Only!',
  'Super flash sale for 48 hours only! Up to 35% off on selected items. First come, first served basis.',
  35.00,
  NULL,
  'flash',
  NOW(),
  NOW() + INTERVAL '2 days',
  5000.00,
  8000.00,
  50,
  0,
  ARRAY[
    'Flash sale valid for 48 hours only',
    'Limited stock available',
    'Up to 35% discount',
    'First come, first served',
    'No returns or exchanges on flash sale items'
  ],
  true,
  true,
  ARRAY['Accessories', 'Audio'],
  'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800',
  NOW()
),

-- Student Offer
(
  'Student Special Discount',
  'Special discount for students and educational institutions. Show your student ID and get 20% off on laptops.',
  20.00,
  NULL,
  'student',
  '2024-11-01',
  '2025-03-31',
  20000.00,
  12000.00,
  500,
  0,
  ARRAY[
    'Valid student ID required',
    '20% discount on laptops only',
    'Minimum purchase ₹20,000',
    'Valid for students and educational institutions',
    'Cannot be combined with other offers'
  ],
  true,
  false,
  ARRAY['Laptops'],
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800',
  NOW()
);

-- Update sequences if they exist
DO $$
BEGIN
    -- Try to update sequence based on current max ID
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'offers_id_seq') THEN
        PERFORM setval('offers_id_seq', (SELECT COALESCE(MAX(id), 1) FROM offers));
    ELSIF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'offers_seq') THEN
        PERFORM setval('offers_seq', (SELECT COALESCE(MAX(id), 1) FROM offers));
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Offers sequence update skipped: %', SQLERRM;
END $$;

COMMIT;

-- Display success message
SELECT 'Sample offers created successfully!' as message;
SELECT COUNT(*) as total_offers FROM public.offers;