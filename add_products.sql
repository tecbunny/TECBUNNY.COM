-- =============================================
-- Add Sample Products Script
-- Adds sample products to the products table
-- =============================================

BEGIN;

-- Insert sample products (template for adding new products)
INSERT INTO public.products (
  name, 
  description, 
  price, 
  category, 
  subcategory,
  brand,
  model,
  sku,
  stock_quantity,
  min_stock_level,
  max_stock_level,
  weight,
  dimensions,
  color,
  material,
  warranty_period,
  features,
  specifications,
  images,
  status,
  is_featured,
  is_priority,
  meta_title,
  meta_description,
  tags
) VALUES 
-- Example Product Template (replace with your actual products)
(
  'Product Name',                    -- name
  'Product description here',        -- description
  0.00,                             -- price
  'Category',                       -- category
  'Subcategory',                    -- subcategory
  'Brand Name',                     -- brand
  'Model Number',                   -- model
  'SKU-CODE-001',                   -- sku
  0,                                -- stock_quantity
  0,                                -- min_stock_level
  0,                                -- max_stock_level
  0.0,                              -- weight
  '0 x 0 x 0 cm',                  -- dimensions
  'Color',                          -- color
  'Material',                       -- material
  12,                               -- warranty_period (months)
  ARRAY['Feature 1', 'Feature 2'],  -- features
  '{"spec1": "value1"}',            -- specifications (JSON)
  ARRAY['image_url_1', 'image_url_2'], -- images
  'active',                         -- status
  false,                            -- is_featured
  false,                            -- is_priority
  'SEO Title',                      -- meta_title
  'SEO Description',                -- meta_description
  ARRAY['tag1', 'tag2']             -- tags
);

-- Update sequences if they exist
DO $$
BEGIN
    -- Try to update sequence based on current max ID
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'products_id_seq') THEN
        PERFORM setval('products_id_seq', (SELECT COALESCE(MAX(id), 1) FROM products));
    ELSIF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'products_seq') THEN
        PERFORM setval('products_seq', (SELECT COALESCE(MAX(id), 1) FROM products));
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Products sequence update skipped: %', SQLERRM;
END $$;

COMMIT;

-- Display success message
SELECT 'Sample products added successfully!' as message;
SELECT COUNT(*) as total_products FROM public.products;