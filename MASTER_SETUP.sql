-- =====================================================
-- MASTER SETUP: Run All Migrations in Order
-- =====================================================
-- Purpose: Apply all pending database changes
-- Run this ONCE in Supabase SQL Editor
-- Date: October 10, 2025
-- =====================================================

-- =====================================================
-- MIGRATION 1: Fix Product Status (Make Products Visible)
-- =====================================================

-- Set all products to 'active' status
UPDATE products
SET status = 'active'
WHERE status IS NULL OR status != 'active';

-- Verify products are active
SELECT 
  status,
  COUNT(*) as count
FROM products
GROUP BY status;

-- Expected output:
-- status  | count
-- --------|-------
-- active  | 9 (or your total number of products)

-- =====================================================
-- MIGRATION 2: Add Product Display Order
-- =====================================================

-- Add display_order column
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create index for efficient sorting
CREATE INDEX IF NOT EXISTS idx_products_display_order 
ON products(display_order DESC, created_at DESC);

-- Set initial display_order based on created_at (newest first)
WITH numbered_products AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at DESC) as row_num
  FROM products
)
UPDATE products p
SET display_order = np.row_num * 10
FROM numbered_products np
WHERE p.id = np.id;

-- Add comment
COMMENT ON COLUMN products.display_order IS 'Controls display order in frontend. Higher values appear first. Gaps of 10 allow easy reordering.';

-- Verify display order was set
SELECT 
  title,
  display_order,
  status,
  created_at
FROM products
ORDER BY display_order DESC
LIMIT 10;

-- =====================================================
-- VERIFICATION: Check Everything is Working
-- =====================================================

-- Check products have both status and display_order
SELECT 
  COUNT(*) as total_products,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_products,
  COUNT(CASE WHEN display_order IS NOT NULL AND display_order > 0 THEN 1 END) as products_with_order,
  MIN(display_order) as min_order,
  MAX(display_order) as max_order
FROM products;

-- Expected output:
-- total_products | active_products | products_with_order | min_order | max_order
-- ---------------|-----------------|---------------------|-----------|----------
-- 9              | 9               | 9                   | 10        | 90

-- Check column types
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('status', 'display_order', 'image', 'images')
ORDER BY ordinal_position;

-- Final check: View products as they'll appear on frontend
SELECT 
  title,
  status,
  display_order,
  CASE 
    WHEN image IS NOT NULL THEN 'Has image'
    ELSE 'NO image'
  END as has_image,
  CASE 
    WHEN images IS NOT NULL THEN array_length(images, 1)
    ELSE 0
  END as images_count
FROM products
ORDER BY display_order DESC, created_at DESC
LIMIT 10;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT '✅ All migrations completed successfully!' as status,
       'Products are now active and have display order' as message,
       'Go to admin panel to start reordering products' as next_step;
