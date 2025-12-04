-- =============================================
-- Add Services Template Script
-- Use this skeleton to insert services into the public.services table
-- =============================================

BEGIN;

-- Insert services (duplicate this VALUES block for each service)
INSERT INTO public.services (
  name,
  description,
  price,
  category,
  duration_hours,
  availability,
  requirements,
  features,
  status,
  is_popular,
  images
) VALUES
(
  'Service Name',                      -- name
  'Service description here',          -- description
  0.00,                                -- price
  'Category',                          -- category
  0,                                   -- duration_hours
  'Availability info',                 -- availability
  ARRAY['Requirement 1', 'Requirement 2'], -- requirements
  ARRAY['Feature 1', 'Feature 2'],     -- features
  'active',                            -- status
  false,                               -- is_popular
  ARRAY['image_url_1', 'image_url_2']  -- images
);

COMMIT;

-- SELECT 'Services template executed successfully!' AS message;